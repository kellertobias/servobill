import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  type PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Service } from '@/common/di';
import { Span } from '../instrumentation';
import type { ConfigService } from './config.service';
import { CONFIG_SERVICE, S3_SERVICE } from './di-tokens';

@Service({
  name: S3_SERVICE,
})
export class S3Service {
  private client: S3Client;
  /** Client used to sign URLs handed to browsers (may use a public endpoint). */
  private presignClient: S3Client;

  /** Path style (`<endpoint>/<bucket>/<key>`) is used with custom endpoints (MinIO). */
  public get usesPathStyle(): boolean {
    return !!this.configuration.endpoints.s3 || this.configuration.isLocal;
  }

  constructor(@Inject(CONFIG_SERVICE) private readonly configuration: ConfigService) {
    const s3Options = {
      ...(this.configuration.endpoints.s3
        ? {
            endpoint: this.configuration.endpoints.s3,
            // S3 compatible stores like MinIO expect path style URLs
            forcePathStyle: true,
          }
        : {}),
      ...(this.configuration.isLocal
        ? {
            disableHostPrefix: true,
            forcePathStyle: true,
            tls: false,
          }
        : {}),
      region: this.configuration.region,
      credentials:
        this.configuration.awsCreds.accessKeyId && this.configuration.awsCreds.secretAccessKey
          ? {
              accessKeyId: this.configuration.awsCreds.accessKeyId,
              secretAccessKey: this.configuration.awsCreds.secretAccessKey,
            }
          : undefined,
    };
    this.client = new S3Client(s3Options);
    this.presignClient = this.configuration.endpoints.s3Public
      ? new S3Client({
          ...s3Options,
          endpoint: this.configuration.endpoints.s3Public,
          forcePathStyle: true,
        })
      : this.client;
  }

  /**
   * Get a signed upload URL for a given location.
   * @param location - The location of the object to upload.
   * @returns A signed upload URL.
   */
  public async getSignedUploadUrl(location: { region?: string; bucket?: string; key: string }) {
    const command = new PutObjectCommand({
      Bucket: location.bucket || this.configuration.buckets.files,
      Key: location.key,
    });

    const url: string = await getSignedUrl(this.presignClient, command, {
      expiresIn: 3600,
    });

    return url;
  }

  /**
   * Get a signed download URL for a given location.
   * @param location - The location of the object to download.
   * @returns A signed download URL.
   */
  public async getSignedUrl(location: {
    region?: string;
    bucket?: string;
    key: string;
    contentDisposition?: string;
  }) {
    return this.signGetObject(location, this.presignClient);
  }

  private async signGetObject(
    location: { bucket?: string; key: string; contentDisposition?: string },
    client: S3Client
  ) {
    const command = new GetObjectCommand({
      Bucket: location.bucket || this.configuration.buckets.files,
      Key: location.key,
      ResponseContentDisposition: location.contentDisposition,
    });

    const url: string = await getSignedUrl(client, command, {
      expiresIn: 3600,
    });

    return url;
  }

  public async deleteObject(location: { region?: string; bucket?: string; key: string }) {
    const command = new DeleteObjectCommand({
      Bucket: location.bucket || this.configuration.buckets.files,
      Key: location.key,
    });

    await this.client.send(command);
  }

  @Span('S3Service.getObject')
  public async getObject(location: { region?: string; bucket?: string; key: string }) {
    const command = new GetObjectCommand({
      Bucket: location.bucket || this.configuration.buckets.files,
      Key: location.key,
    });

    const response = await this.client.send(command);
    return response.Body;
  }

  @Span('S3Service.putObject')
  public async putObject(location: {
    region?: string;
    bucket?: string;
    key: string;
    body: string | Buffer;
    public?: boolean;
    contentType?: string;
    contentDisposition?: string;
  }) {
    const commandProps: PutObjectCommandInput = {
      Bucket: location.bucket || this.configuration.buckets.files,
      Key: location.key,
      Body: location.body,
      // StorageClass: this.configuration.isLocal
      // 	? 'STANDARD'
      // 	: 'INTELLIGENT_TIERING',
      ACL: location.public ? 'public-read' : 'private',
    };
    if (location.contentType) {
      commandProps.ContentType = location.contentType;
    }
    if (location.contentDisposition) {
      commandProps.ContentDisposition = location.contentDisposition;
    }
    const command = new PutObjectCommand(commandProps);
    await this.client.send(command);

    // The stored resource URL uses the internal endpoint, see getFileDescriptor.
    const url = await this.signGetObject(location, this.client);
    const [resource] = url.split('?');
    return resource;
  }
}

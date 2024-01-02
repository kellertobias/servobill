import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
	S3Client,
	GetObjectCommand,
	PutObjectCommand,
	PutObjectCommandInput,
} from '@aws-sdk/client-s3';

import { ConfigService } from './config.service';

import { Inject, Service } from '@/common/di';

@Service()
export class S3Service {
	private client: S3Client;

	constructor(
		@Inject(ConfigService) private readonly configuration: ConfigService,
	) {
		const s3Options = {
			...(this.configuration.endpoints.s3
				? {
						endpoint: this.configuration.endpoints.s3,
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
				this.configuration.awsCreds.accessKeyId &&
				this.configuration.awsCreds.secretAccessKey
					? {
							accessKeyId: this.configuration.awsCreds.accessKeyId,
							secretAccessKey: this.configuration.awsCreds.secretAccessKey,
						}
					: undefined,
		};
		this.client = new S3Client(s3Options);
	}

	public async getSignedUrl(location: {
		region?: string;
		bucket?: string;
		key: string;
	}) {
		const command = new GetObjectCommand({
			Bucket: location.bucket || this.configuration.buckets.files,
			Key: location.key,
		});

		const url: string = await getSignedUrl(this.client, command, {
			expiresIn: 3600,
		});

		return url;
	}

	public async getObject(location: {
		region?: string;
		bucket?: string;
		key: string;
	}) {
		const command = new GetObjectCommand({
			Bucket: location.bucket || this.configuration.buckets.files,
			Key: location.key,
		});

		const response = await this.client.send(command);
		return response.Body;
	}

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

		const url = await this.getSignedUrl(location);
		const [resource] = url.split('?');
		return resource;
	}
}

import { FILE_STORAGE_S3_TEST_SET, FILE_STORAGE_SERVICE } from './di-tokens';
import { FileStorageService } from './interface';

import { CONFIG_SERVICE, S3_SERVICE } from '@/backend/services/di-tokens';
import { FileStorageType } from '@/backend/services/constants';
import type { S3Service } from '@/backend/services/s3.service';
import type { ConfigService } from '@/backend/services/config.service';
import { Span } from '@/backend/instrumentation';
import { DefaultContainer, Inject, Service } from '@/common/di';
import { AttachmentEntity } from '@/backend/entities/attachment.entity';

import '@/backend/services/s3.service';

/**
 * Implementation of FileStorageService that delegates to S3 or local file system.
 */
@Service({
	name: FILE_STORAGE_SERVICE,
	shouldRegister: () => {
		const configService = DefaultContainer.get<ConfigService>(CONFIG_SERVICE);

		return configService.fileStorage.type === FileStorageType.S3;
	},
	addToTestSet: [FILE_STORAGE_S3_TEST_SET],
})
export class FileStorageServiceS3 implements FileStorageService {
	private defaultBucket: string;

	constructor(
		@Inject(CONFIG_SERVICE) private readonly config: ConfigService,
		@Inject(S3_SERVICE) private readonly s3: S3Service,
	) {
		if (this.config.fileStorage.type !== FileStorageType.S3) {
			throw new Error('FileStorageServiceS3 is not supported');
		}
		this.defaultBucket = this.config.buckets.files;
	}

	/**
	 * Retrieve a file as a Buffer, from S3 or local disk.
	 */
	@Span('FileStorageServiceS3.getFile')
	async getFile(key: string, options?: { bucket?: string }): Promise<Buffer> {
		const bucket = options?.bucket ?? this.defaultBucket;

		const s3Object = await this.s3.getObject({ bucket, key });
		if (!s3Object) {
			throw new Error('File not found in S3');
		}

		const chunks: Buffer[] = [];
		for await (const chunk of s3Object as NodeJS.ReadableStream) {
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
		}

		// TypeScript/Node quirk: Buffer.concat expects Buffer[], workaround for readonly/Buffer[] type mismatch
		return Buffer.concat(Array.prototype.slice.call(chunks));
	}

	/**
	 * Save a file to S3.
	 */
	@Span('FileStorageServiceS3.saveFile')
	async saveFile(
		key: string,
		file: Buffer,
		options?: { bucket?: string },
	): Promise<string> {
		const bucket = options?.bucket ?? this.defaultBucket;
		return this.s3.putObject({ bucket, key, body: file });
	}

	/**
	 * Delete a file from S3 or local disk.
	 */
	@Span('FileStorageServiceS3.deleteFile')
	async deleteFile(key: string, options?: { bucket?: string }): Promise<void> {
		const bucket = options?.bucket ?? this.defaultBucket;
		await this.s3.deleteObject({ bucket, key });
	}

	/**
	 * Get a URL for uploading a file (S3 signed URL or local API endpoint).
	 */
	@Span('FileStorageServiceS3.getUploadUrl')
	async getUploadUrl(attachment: AttachmentEntity): Promise<string> {
		const bucket = attachment.s3Bucket;
		const key = attachment.s3Key;

		return this.s3.getSignedUploadUrl({ bucket, key });
	}

	/**
	 * Get a URL for downloading a file (S3 signed URL or local API endpoint).
	 */
	@Span('FileStorageServiceS3.getDownloadUrl')
	async getDownloadUrl(
		attachment: AttachmentEntity | { bucket: string; key: string },
	): Promise<string> {
		const bucket =
			'bucket' in attachment ? attachment.bucket : attachment.s3Bucket;
		const key = 'key' in attachment ? attachment.key : attachment.s3Key;
		const fileName = 'fileName' in attachment ? attachment.fileName : undefined;

		return this.s3.getSignedUrl({
			bucket,
			key,
			contentDisposition: fileName
				? `attachment; filename="${fileName}"`
				: undefined,
		});
	}

	getFileDescriptor(url: string): { bucket?: string; key: string } | null {
		try {
			const urlObj = new URL(url);
			return {
				bucket: urlObj.hostname.split('.')[0],
				key: urlObj.pathname.slice(1),
			};
		} catch {
			return null;
		}
	}
}

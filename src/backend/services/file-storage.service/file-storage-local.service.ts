import * as fs from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';

import { FILE_STORAGE_SERVICE } from './di-tokens';
import { FileStorageService } from './interface';

import { CONFIG_SERVICE } from '@/backend/services/di-tokens';
import { FileStorageType } from '@/backend/services/constants';
import type { ConfigService } from '@/backend/services/config.service';
import { Span } from '@/backend/instrumentation';
import { DefaultContainer, Inject, Service } from '@/common/di';
import { AttachmentEntity } from '@/backend/entities/attachment.entity';

/**
 * Implementation of FileStorageService that delegates to S3 or local file system.
 */
@Service({
	name: FILE_STORAGE_SERVICE,
	shouldRegister: () => {
		const configService = DefaultContainer.get<ConfigService>(CONFIG_SERVICE);

		return configService.fileStorage.type === FileStorageType.LOCAL;
	},
})
export class FileStorageServiceLocal implements FileStorageService {
	private filesDirectory: string;
	private defaultSubDirectory = 'uploads';

	constructor(@Inject(CONFIG_SERVICE) private readonly config: ConfigService) {
		if (this.config.fileStorage.type !== FileStorageType.LOCAL) {
			throw new Error('FileStorageServiceLocal is not supported');
		}
		this.filesDirectory = this.config.fileStorage.baseDirectory;
	}

	/**
	 * Retrieve a file as a Buffer, from S3 or local disk.
	 */
	@Span('FileStorageServiceS3.getFile')
	async getFile(key: string, options?: { bucket?: string }): Promise<Buffer> {
		const bucket = options?.bucket ?? this.defaultSubDirectory;
		const filePath = path.join(this.filesDirectory, bucket, key);
		return await fs.readFile(filePath);
	}

	/**
	 * Save a file to S3 or local disk.
	 * Converts Buffer to Uint8Array to ensure compatibility with fs.writeFile.
	 */
	@Span('FileStorageServiceS3.saveFile')
	async saveFile(
		key: string,
		file: Buffer,
		options?: { bucket?: string },
	): Promise<string> {
		const bucket = options?.bucket ?? this.defaultSubDirectory;
		const filePath = path.join(this.filesDirectory, bucket, key);

		// Ensure the directory exists
		const dir = path.dirname(filePath);
		if (!existsSync(dir)) {
			await fs.mkdir(dir, { recursive: true });
		}

		// Convert Buffer to Uint8Array for compatibility with fs.writeFile
		await fs.writeFile(filePath, new Uint8Array(file));

		return this.getDownloadUrl({ bucket, key });
	}

	/**
	 * Delete a file from S3 or local disk.
	 */
	@Span('FileStorageServiceS3.deleteFile')
	async deleteFile(key: string, options?: { bucket?: string }): Promise<void> {
		const bucket = options?.bucket ?? this.defaultSubDirectory;
		const filePath = path.join(this.filesDirectory, bucket, key);
		await fs.unlink(filePath);
	}

	/**
	 * Get a URL for uploading a file (S3 signed URL or local API endpoint).
	 */
	@Span('FileStorageServiceS3.getUploadUrl')
	async getUploadUrl(attachment: AttachmentEntity): Promise<string> {
		return `/api/upload?attachmentId=${encodeURIComponent(attachment.id)}`;
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

		if (attachment instanceof AttachmentEntity) {
			return `/api/download?attachmentId=${encodeURIComponent(attachment.id)}`;
		}

		return `/api/download?bucket=${encodeURIComponent(
			bucket,
		)}&key=${encodeURIComponent(key)}`;
	}

	getFileDescriptor(url: string): { bucket?: string; key: string } | null {
		try {
			const urlObj = new URL(url);
			return {
				bucket: urlObj.hostname,
				key: urlObj.pathname.slice(1),
			};
		} catch {
			return null;
		}
	}
}

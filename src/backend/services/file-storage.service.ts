// src/backend/services/file-storage.service.ts
import * as fs from 'fs/promises';
import path from 'path';

import { Span } from '../instrumentation';

import { CONFIG_SERVICE } from './di-tokens';
import type { ConfigService } from './config.service';
import { S3Service } from './s3.service';

import { Inject, Service } from '@/common/di';

/**
 * DI token for the file storage service abstraction.
 */
export const FILE_STORAGE_SERVICE = 'FileStorageService';

/**
 * Abstraction for file storage (S3 or local), for retrieving and deleting files.
 */
export interface FileStorageService {
	/**
	 * Retrieve a file as a Buffer, given a bucket and key.
	 */
	getFile(bucket: string, key: string): Promise<Buffer>;
	/**
	 * Delete a file, given a bucket and key.
	 */
	deleteFile(bucket: string, key: string): Promise<void>;
	/**
	 * Get a URL for uploading a file (S3 signed URL or local API endpoint).
	 */
	getUploadUrl(
		bucket: string,
		key: string,
		attachmentId?: string,
	): Promise<string>;
	/**
	 * Get a URL for downloading a file (S3 signed URL or local API endpoint).
	 */
	getDownloadUrl(
		bucket: string,
		key: string,
		fileName?: string,
		attachmentId?: string,
	): Promise<string>;
}

/**
 * Implementation of FileStorageService that delegates to S3 or local file system.
 */
@Service({ name: FILE_STORAGE_SERVICE })
export class FileStorageServiceImpl implements FileStorageService {
	constructor(
		@Inject(CONFIG_SERVICE) private readonly config: ConfigService,
		@Inject(S3Service) private readonly s3: S3Service,
	) {}

	/**
	 * Retrieve a file as a Buffer, from S3 or local disk.
	 */
	@Span('FileStorageService.getFile')
	async getFile(bucket: string, key: string): Promise<Buffer> {
		if (this.config.endpoints.s3) {
			// S3 mode
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
		} else {
			// Local mode
			if (!this.config.uploadDirectory) {
				throw new Error('UPLOAD_DIRECTORY is not set for local file storage');
			}
			const filePath = path.join(this.config.uploadDirectory, key);
			return await fs.readFile(filePath);
		}
	}

	/**
	 * Delete a file from S3 or local disk.
	 */
	@Span('FileStorageService.deleteFile')
	async deleteFile(bucket: string, key: string): Promise<void> {
		if (this.config.endpoints.s3) {
			await this.s3.deleteObject({ bucket, key });
		} else {
			if (!this.config.uploadDirectory) {
				throw new Error('UPLOAD_DIRECTORY is not set for local file storage');
			}
			const filePath = path.join(this.config.uploadDirectory, key);
			await fs.unlink(filePath);
		}
	}

	/**
	 * Get a URL for uploading a file (S3 signed URL or local API endpoint).
	 */
	async getUploadUrl(
		bucket: string,
		key: string,
		attachmentId?: string,
	): Promise<string> {
		if (this.config.endpoints.s3) {
			// S3 mode
			return this.s3.getSignedUploadUrl({ bucket, key });
		} else {
			// Local mode: return local API endpoint for upload
			if (!attachmentId) {
				throw new Error('attachmentId required for local upload URL');
			}
			return `/api/upload?attachmentId=${encodeURIComponent(attachmentId)}`;
		}
	}

	/**
	 * Get a URL for downloading a file (S3 signed URL or local API endpoint).
	 */
	async getDownloadUrl(
		bucket: string,
		key: string,
		fileName?: string,
		attachmentId?: string,
	): Promise<string> {
		if (this.config.endpoints.s3) {
			// S3 mode
			return this.s3.getSignedUrl({
				bucket,
				key,
				contentDisposition: fileName
					? `attachment; filename="${fileName}"`
					: undefined,
			});
		} else {
			// Local mode: return local API endpoint for download
			if (!attachmentId) {
				throw new Error('attachmentId required for local download URL');
			}
			return `/api/attachments/download/${encodeURIComponent(attachmentId)}`;
		}
	}
}

import { AttachmentEntity } from '@/backend/entities/attachment.entity';

/**
 * Abstraction for file storage (S3 or local), for retrieving and deleting files.
 */
export interface FileStorageService {
	/**
	 * Retrieve a file as a Buffer, given a bucket and key.
	 */
	getFile(key: string, options?: { bucket?: string }): Promise<Buffer>;

	/**
	 * Saves a file to the storage, given a bucket and key.
	 */
	saveFile(
		key: string,
		file: Buffer,
		options?: { bucket?: string },
	): Promise<string>;

	/**
	 * Delete a file, given a bucket and key.
	 */
	deleteFile(key: string, options?: { bucket?: string }): Promise<void>;

	/**
	 * Get a URL for uploading a file (S3 signed URL or local API endpoint).
	 */
	getUploadUrl(attachment: AttachmentEntity): Promise<string>;

	/**
	 * Get a URL for downloading a file (S3 signed URL or local API endpoint).
	 */
	getDownloadUrl(
		attachment: AttachmentEntity | { bucket?: string; key: string },
	): Promise<string>;

	getFileDescriptor(url: string): { bucket?: string; key: string } | null;
}

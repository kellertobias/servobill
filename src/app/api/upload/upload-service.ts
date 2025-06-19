import { Inject, Service } from '@/common/di';
import { ConfigService } from '@/backend/services/config.service';
import {
	FILE_STORAGE_SERVICE,
	type FileStorageService,
} from '@/backend/services/file-storage.service';
import { CONFIG_SERVICE } from '@/backend/services/di-tokens';
import { FileStorageType } from '@/backend/services/constants';
import {
	ATTACHMENT_REPOSITORY,
	type AttachmentRepository,
} from '@/backend/repositories';

export class NotConfiguredError extends Error {
	constructor() {
		super('Local file storage is not enabled in this deployment');
	}
}

export class NotFoundError extends Error {
	constructor(message: string = 'File not found') {
		super(message);
	}
}

@Service()
export class UploadHelper {
	constructor(
		@Inject(CONFIG_SERVICE)
		private readonly config: ConfigService,
		@Inject(FILE_STORAGE_SERVICE)
		private readonly fileStorageService: FileStorageService,
		@Inject(ATTACHMENT_REPOSITORY)
		private readonly attachmentRepository: AttachmentRepository,
	) {
		if (this.config.fileStorage.type !== FileStorageType.LOCAL) {
			throw new NotConfiguredError();
		}
	}

	/**
	 * Upload a file to storage.
	 * @param attachmentId - The ID of the attachment to upload
	 * @param file - The file data as a Buffer
	 */
	async uploadFile(attachmentId: string, file: Buffer) {
		const attachment = await this.attachmentRepository.getById(attachmentId);
		if (!attachment) {
			throw new NotFoundError('Attachment not found');
		}

		if (attachment.status !== 'pending') {
			throw new NotFoundError('Attachment is not pending');
		}

		await this.fileStorageService.saveFile(attachment.s3Key, file, {
			bucket: attachment.s3Bucket,
		});

		return attachment;
	}
}

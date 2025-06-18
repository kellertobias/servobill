import { Inject, Service } from '@/common/di';
import { CONFIG_SERVICE } from '@/backend/services/di-tokens';
import { ConfigService } from '@/backend/services/config.service';
import {
	FILE_STORAGE_SERVICE,
	type FileStorageService,
} from '@/backend/services/file-storage.service';
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
export class DownloadHelper {
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

	async getFileByAttachmentId(attachmentId: string) {
		const attachment = await this.attachmentRepository.getById(attachmentId);
		if (!attachment) {
			throw new NotFoundError('Attachment not found');
		}

		return {
			file: await this.fileStorageService.getFile(attachment.s3Key, {
				bucket: attachment.s3Bucket,
			}),
			fileName: attachment.fileName,
			contentType: attachment.mimeType,
		};
	}

	async getFileByKey(key: string, bucket?: string | null) {
		return {
			file: await this.fileStorageService.getFile(key, {
				bucket: bucket ?? undefined,
			}),
			fileName: key,
			contentType: 'application/octet-stream',
		};
	}
}

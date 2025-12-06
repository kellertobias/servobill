import type { SESEvent } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { simpleParser } from 'mailparser';
import { AttachmentEntity } from '@/backend/entities/attachment.entity';
import { ReceiptEvent } from '@/backend/events/receipt/event';
import {
	ATTACHMENT_REPOSITORY,
	type AttachmentRepository,
} from '@/backend/repositories/attachment';
import {
	SETTINGS_REPOSITORY,
	type SettingsRepository,
} from '@/backend/repositories/settings';
import { EVENTBUS_SERVICE } from '@/backend/services/di-tokens';
import type { EventBusService } from '@/backend/services/eventbus.service';
import {
	FILE_STORAGE_SERVICE,
	type FileStorageService,
} from '@/backend/services/file-storage.service';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';

@Service()
export class InboundEmailProcessor {
	private readonly logger = new Logger('InboundEmailProcessor');

	constructor(
		@Inject(FILE_STORAGE_SERVICE)
		private readonly fileStorageService: FileStorageService,
		@Inject(ATTACHMENT_REPOSITORY)
		private readonly attachmentRepository: AttachmentRepository,
		@Inject(EVENTBUS_SERVICE)
		private readonly eventBus: EventBusService,
		@Inject(SETTINGS_REPOSITORY)
		private readonly settingsRepository: SettingsRepository,
	) {}

	async process(event: SESEvent): Promise<void> {
		this.logger.info('Processing inbound email event', {
			recordCount: event.Records.length,
		});

		for (const record of event.Records) {
			await this.processRecord(record);
		}
	}

	private async processRecord(record: SESEvent['Records'][0]): Promise<void> {
		const messageId = record.ses.mail.messageId;
		this.logger.info('Processing email record', { messageId });

		// Check if Allowed Emails are configured
		const allowedEmails = process.env.ALLOWED_EMAILS
			? process.env.ALLOWED_EMAILS.split(',').map((e) => e.trim())
			: [];

		const from = record.ses.mail.source;

		if (allowedEmails.length > 0 && !allowedEmails.includes(from)) {
			this.logger.warn('Email sender not allowed', { from });
			return;
		}

		try {
			// 1. Get raw email content from S3
			// The SES Receipt Rule should be configured to store emails in 'emails/' prefix
			const s3Key = `emails/${messageId}`;
			const bucketName = process.env.BUCKET_FILES;

			if (!bucketName) {
				throw new Error('BUCKET_FILES environment variable not set');
			}

			this.logger.info('Fetching email from S3', { bucketName, s3Key });
			const emailContent = await this.fileStorageService.getFile(s3Key, {
				bucket: bucketName,
			});

			// 2. Parse email
			this.logger.info('Parsing email content');
			const parsedEmail = await simpleParser(emailContent);

			const attachmentIds: string[] = [];
			const userId = 'system'; // Or derive from email/config if multi-tenant

			// 3. Process attachments
			if (parsedEmail.attachments && parsedEmail.attachments.length > 0) {
				this.logger.info('Processing attachments', {
					count: parsedEmail.attachments.length,
				});

				for (const attachment of parsedEmail.attachments) {
					const id = randomUUID();
					const fileName = attachment.filename || `attachment-${id}`;
					const mimeType = attachment.contentType;
					const s3AttachmentKey = `attachments/${id}/${fileName}`;

					this.logger.info('Uploading attachment', {
						fileName,
						mimeType,
						s3Key: s3AttachmentKey,
					});

					// Upload attachment to S3
					await this.fileStorageService.saveFile(
						s3AttachmentKey,
						attachment.content,
						{ bucket: bucketName },
					);

					// Create Attachment Entity
					const attachmentEntity = new AttachmentEntity({
						id,
						fileName,
						mimeType,
						size: attachment.size,
						s3Key: s3AttachmentKey,
						s3Bucket: bucketName,
						status: 'pending',
					});

					await this.attachmentRepository.save(attachmentEntity);
					attachmentIds.push(id);
				}
			}

			// 4. Extract text body (prefer text, fallback to html if needed, but receipt extractor usually wants text)
			const emailText = parsedEmail.text || parsedEmail.html || '';

			if (attachmentIds.length === 0 && !emailText) {
				this.logger.warn('No attachments or text found in email', {
					messageId,
				});
				return;
			}

			// 5. Publish ReceiptEvent
			const receiptEvent = new ReceiptEvent({
				id: randomUUID(),
				attachmentIds,
				emailText: emailText,
				// Potentially extract currency or other metadata if needed,
				// but ReceiptEvent usually relies on text/attachments.
			});

			this.logger.info('Publishing receipt event', {
				eventId: receiptEvent.id,
				attachmentCount: attachmentIds.length,
			});

			await this.eventBus.send('receipt', receiptEvent);

			// 6. Cleanup raw email?
			// Optional: Delete the raw email from S3 to save space, or keep it for debugging.
			// Keeping it for now as it might be useful.
		} catch (error) {
			this.logger.error('Failed to process inbound email', {
				messageId,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}
}

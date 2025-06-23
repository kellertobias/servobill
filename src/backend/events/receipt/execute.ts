import { ReceiptEvent } from './event';
import { ReceiptLLMExtractionService } from './receipt-llm-extraction.service';
import {
	ReceiptClassification,
	ReceiptClassificationService,
} from './receipt-classification.service';
import { ReceiptStructuredExtractionService } from './receipt-structured-extraction.service';
import { generateExpensesSummaryHtml } from './email-template';

import { Service, Inject } from '@/common/di';
import { Logger } from '@/backend/services/logger.service';
import {
	ATTACHMENT_REPOSITORY,
	type AttachmentRepository,
} from '@/backend/repositories/attachment';
import {
	FILE_STORAGE_SERVICE,
	type FileStorageService,
} from '@/backend/services/file-storage.service';
import { SESService } from '@/backend/services/ses.service';
import {
	SETTINGS_REPOSITORY,
	type SettingsRepository,
} from '@/backend/repositories/settings';
import { CompanyDataSetting } from '@/backend/entities/settings.entity';
import { ExpenseEntity } from '@/backend/entities/expense.entity';
import { AttachmentEntity } from '@/backend/entities/attachment.entity';

/**
 * Main execution handler for receipt events
 * Orchestrates the classification and extraction of receipt data
 */
@Service()
export class HandlerExecution {
	private readonly logger = new Logger('ReceiptHandler');

	constructor(
		@Inject(ReceiptLLMExtractionService)
		private readonly llmExtractionService: ReceiptLLMExtractionService,
		@Inject(ReceiptStructuredExtractionService)
		private readonly structuredExtractionService: ReceiptStructuredExtractionService,
		@Inject(ATTACHMENT_REPOSITORY)
		private readonly attachmentRepository: AttachmentRepository,
		@Inject(FILE_STORAGE_SERVICE)
		private readonly fileStorageService: FileStorageService,
		@Inject(SESService)
		private readonly sesService: SESService,
		@Inject(SETTINGS_REPOSITORY)
		private readonly settingsRepository: SettingsRepository,
	) {}

	/**
	 * Execute the receipt processing workflow
	 *
	 * Logic:
	 * - If there's no email text and multiple attachments: Create separate events for each attachment
	 * - If there's email text: Process all attachments together as they belong to the same email
	 * - If there's no email text and single attachment: Process normally
	 */
	async execute(event: ReceiptEvent): Promise<void> {
		this.logger.info('Processing receipt event', {
			eventId: event.id,
			hasAttachments: !!event.attachmentIds?.length,
			attachmentCount: event.attachmentIds?.length || 0,
			hasEmailText: !!event.emailText,
		});

		// Process the event normally (single attachment or multiple attachments with email text)
		try {
			const attachments = await this.downloadAttachments(
				event.attachmentIds || [],
			);

			const classification =
				await ReceiptClassificationService.classifyReceipt(attachments);

			const strategy =
				classification === ReceiptClassification.Structured
					? this.structuredExtractionService
					: this.llmExtractionService;

			const result = await strategy.extract({
				text: event.emailText || '',
				attachments,
			});

			const firstExpenseId = result.expenses[0]?.id;

			for (const { attachmentEntity } of attachments) {
				attachmentEntity.addExpenseId(firstExpenseId);
				await this.attachmentRepository.save(attachmentEntity);
			}

			this.logger.info('Receipt processing completed successfully', {
				eventId: event.id,
				classification: classification,
				expenseIds: result.expenses.map((expense) => expense.id),
				attachmentCount: attachments.length,
			});

			// Send email notification with extracted expenses summary
			await this.sendExtractionSummaryEmail(
				event,
				result.expenses,
				attachments,
			);
		} catch (error) {
			this.logger.error('Receipt processing failed', {
				eventId: event.id,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * Send email notification with summary of extracted expenses
	 */
	private async sendExtractionSummaryEmail(
		event: ReceiptEvent,
		expenses: ExpenseEntity[],
		attachments: { content: Buffer; mimeType: string; name: string }[],
	): Promise<void> {
		try {
			// Get company settings for email configuration
			const companyData =
				await this.settingsRepository.getSetting(CompanyDataSetting);

			if (!companyData.replyTo) {
				this.logger.warn(
					'No reply-to email configured, skipping notification email',
				);
				return;
			}

			if (!companyData.sendFrom) {
				this.logger.warn(
					'No send-from email configured, skipping notification email',
				);
				return;
			}

			const subject = `Receipt Processing Complete - ${expenses.length} Expenses Extracted`;
			const html = generateExpensesSummaryHtml(expenses, attachments, event);

			await this.sesService.sendEmail({
				from: companyData.sendFrom,
				to: companyData.replyTo,
				replyTo: companyData.replyTo,
				subject,
				html,
			});

			this.logger.info('Extraction summary email sent successfully', {
				eventId: event.id,
				to: companyData.replyTo,
				expenseCount: expenses.length,
			});
		} catch (error) {
			this.logger.error('Failed to send extraction summary email', {
				eventId: event.id,
				error: error instanceof Error ? error.message : String(error),
			});
			// Don't throw here - email failure shouldn't break the main process
		}
	}

	/**
	 * Download attachments for processing
	 */
	private async downloadAttachments(attachmentIds: string[]): Promise<
		{
			content: Buffer;
			mimeType: string;
			name: string;
			id: string;
			attachmentEntity: AttachmentEntity;
		}[]
	> {
		const attachments: {
			content: Buffer;
			mimeType: string;
			name: string;
			id: string;
			attachmentEntity: AttachmentEntity;
		}[] = [];

		for (const attachmentId of attachmentIds) {
			try {
				const attachment =
					await this.attachmentRepository.getById(attachmentId);

				if (!attachment) {
					this.logger.warn('Attachment not found', { attachmentId });
					continue;
				}

				const content = await this.fileStorageService.getFile(
					attachment.s3Key,
					{
						bucket: attachment.s3Bucket,
					},
				);

				attachments.push({
					content,
					mimeType: attachment.mimeType,
					name: attachment.fileName,
					id: attachment.id,
					attachmentEntity: attachment,
				});

				this.logger.info('Downloaded attachment for processing', {
					attachmentId,
					fileName: attachment.fileName,
					size: content.length,
				});
			} catch (error) {
				this.logger.error('Failed to download attachment for processing', {
					attachmentId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		return attachments;
	}
}

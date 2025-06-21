import { ReceiptEvent } from './event';

import { Service, Inject } from '@/common/di';
import { Logger } from '@/backend/services/logger.service';
import {
	FILE_STORAGE_SERVICE,
	type FileStorageService,
} from '@/backend/services/file-storage.service';

/**
 * Classification result for receipt processing
 */
export enum ReceiptClassification {
	Structured = 'structured',
	Extraction = 'extraction',
}

/**
 * Service for classifying receipts and determining processing strategy
 * Uses LLM to analyze receipt content and determine if it's a digital invoice
 * or requires manual extraction
 */
@Service()
export class ReceiptClassificationService {
	private readonly logger = new Logger('ReceiptClassificationService');

	private readonly downloadedAttachments: Map<
		string,
		{ content: Buffer; mimeType: string; name: string }
	> = new Map();

	constructor(
		@Inject(FILE_STORAGE_SERVICE)
		private readonly fileStorageService: FileStorageService,
	) {}

	/**
	 * Classify a receipt to determine processing strategy
	 * @param event The receipt event containing attachment and email data
	 * @returns Classification result with type and confidence
	 */
	public async classifyReceipt(
		event: ReceiptEvent,
	): Promise<ReceiptClassification> {
		this.logger.info('Classifying receipt', {
			eventId: event.id,
			hasAttachment: !!event.attachmentKey,
			hasEmailText: !!event.emailText,
		});

		const attachment = await this.downloadAttachment(event);
		if (!attachment) {
			return ReceiptClassification.Extraction;
		}

		const isStructuredInvoice = await this.isStructuredInvoice(attachment);

		return isStructuredInvoice
			? ReceiptClassification.Structured
			: ReceiptClassification.Extraction;
	}

	public get attachments(): {
		content: Buffer;
		mimeType: string;
		name: string;
	}[] {
		return [...this.downloadedAttachments.values()];
	}

	private async downloadAttachment(
		event: ReceiptEvent,
	): Promise<Buffer | null> {
		if (!event.attachmentKey) {
			return null;
		}
		const attachment = await this.fileStorageService.getFile(
			event.attachmentKey,
			{
				bucket: event.attachmentBucket,
			},
		);

		// get attachment mime type

		this.downloadedAttachments.set(event.attachmentKey, {
			content: attachment,
			mimeType: this.getMimeTypeFromKey(event.attachmentKey),
			name: event.attachmentKey,
		});
		return attachment;
	}

	/**
	 * Check email text for indicators of digital invoices
	 * @param emailText The email text to analyze
	 * @returns True if likely a digital invoice
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	private async isStructuredInvoice(attachment: Buffer): Promise<boolean> {
		// Since we do not yet support structured invoices, we will return false
		return false;
	}

	/**
	 * Get MIME type from file key/name
	 */
	private getMimeTypeFromKey(key: string): string {
		const extension = key.split('.').pop()?.toLowerCase();

		switch (extension) {
			case 'pdf': {
				return 'application/pdf';
			}
			case 'jpg':
			case 'jpeg': {
				return 'image/jpeg';
			}
			case 'png': {
				return 'image/png';
			}
			case 'gif': {
				return 'image/gif';
			}
			case 'webp': {
				return 'image/webp';
			}
			default: {
				return 'application/octet-stream';
			}
		}
	}
}

import { ReceiptEvent } from './event';
import { ReceiptLLMExtractionService } from './receipt-llm-extraction.service';
import {
	ReceiptClassification,
	ReceiptClassificationService,
} from './receipt-classification.service';
import { ReceiptStructuredExtractionService } from './receipt-structured-extraction.service';

import { Service, Inject } from '@/common/di';
import { Logger } from '@/backend/services/logger.service';

/**
 * Main execution handler for receipt events
 * Orchestrates the classification and extraction of receipt data
 */
@Service()
export class HandlerExecution {
	private readonly logger = new Logger('ReceiptHandler');

	constructor(
		@Inject(ReceiptClassificationService)
		private readonly classificationService: ReceiptClassificationService,
		@Inject(ReceiptLLMExtractionService)
		private readonly llmExtractionService: ReceiptLLMExtractionService,
		@Inject(ReceiptStructuredExtractionService)
		private readonly structuredExtractionService: ReceiptStructuredExtractionService,
	) {}

	/**
	 * Execute the receipt processing workflow
	 * 1. Classify the receipt type (digital invoice vs regular receipt)
	 * 2. Extract expense information based on classification
	 */
	async execute(event: ReceiptEvent): Promise<void> {
		this.logger.info('Processing receipt event', {
			eventId: event.id,
			hasAttachment: !!event.attachmentKey,
			hasEmailText: !!event.emailText,
		});

		try {
			// Step 1: Classify the receipt type
			const classification =
				await this.classificationService.classifyReceipt(event);

			const attachments = this.classificationService.attachments;

			const strategy =
				classification === ReceiptClassification.Structured
					? this.llmExtractionService
					: this.structuredExtractionService;

			const result = await strategy.extract({
				text: event.emailText || '',
				attachments,
			});

			this.logger.info('Receipt processing completed successfully', {
				eventId: event.id,
				classification: classification,
				expenseIds: result.expenses.map((expense) => expense.id),
			});
		} catch (error) {
			this.logger.error('Receipt processing failed', {
				eventId: event.id,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}
}

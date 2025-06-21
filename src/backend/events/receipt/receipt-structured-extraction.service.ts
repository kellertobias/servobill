import { ReceiptExtractorService, ReceiptResult } from './receipt-interface';

import {
	SETTINGS_REPOSITORY,
	EXPENSE_REPOSITORY,
	type SettingsRepository,
	type ExpenseRepository,
} from '@/backend/repositories';
import { Service, Inject } from '@/common/di';
import { Logger } from '@/backend/services/logger.service';

/**
 * Extracted expense item from receipt
 */
export interface ExtractedExpenseItem {
	name: string;
	expendedCents: number;
	taxCents: number;
	expendedAt: Date;
	description?: string;
	categoryId?: string;
}

/**
 * Service for extracting expense information from receipts using LLM
 * Processes PDFs and images to extract structured expense data
 */
@Service()
export class ReceiptStructuredExtractionService
	implements ReceiptExtractorService
{
	private readonly logger = new Logger('ReceiptExtractionService');

	constructor(
		@Inject(SETTINGS_REPOSITORY)
		private readonly settingsRepository: SettingsRepository,
		@Inject(EXPENSE_REPOSITORY)
		private readonly expenseRepository: ExpenseRepository,
	) {}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public async extract(source: {
		text: string;
		attachments: { content: Buffer; name: string; mimeType: string }[];
	}): Promise<ReceiptResult> {
		throw new Error('Not implemented');
	}
}

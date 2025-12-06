import type { ExpenseEntity } from '@/backend/entities/expense.entity';
import { ExpenseSettingsEntity } from '@/backend/entities/settings.entity';
import {
	EXPENSE_REPOSITORY,
	type ExpenseRepository,
	SETTINGS_REPOSITORY,
	type SettingsRepository,
} from '@/backend/repositories';
import { LLM_SERVICE } from '@/backend/services/di-tokens';
import type { LLMService } from '@/backend/services/llm.service';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';
import getExtractionPrompt from './prompts/extract';
import type {
	ReceiptExtractorService,
	ReceiptResult,
} from './receipt-interface';

/**
 * Extracted expense item from receipt
 */
export interface ExtractedExpenseItem {
	name: string;
	expendedCents: number;
	taxCents: number;
	expendedAt: Date;
	description?: string;
	notes?: string;
	categoryId?: string;
}

/**
 * Service for extracting expense information from receipts using LLM
 * Processes PDFs and images to extract structured expense data
 */
@Service()
export class ReceiptLLMExtractionService implements ReceiptExtractorService {
	private readonly logger = new Logger('ReceiptExtractionService');

	constructor(
		@Inject(LLM_SERVICE)
		private readonly llmService: LLMService,
		@Inject(SETTINGS_REPOSITORY)
		private readonly settingsRepository: SettingsRepository,
		@Inject(EXPENSE_REPOSITORY)
		private readonly expenseRepository: ExpenseRepository,
	) {}

	public async extract(source: {
		text: string;
		attachments: {
			content: Buffer;
			name: string;
			mimeType: string;
			id: string;
		}[];
		currency: string;
	}): Promise<ReceiptResult> {
		try {
			const { categories } = await this.loadData();
			const systemPrompt = getExtractionPrompt(
				source.text,
				categories,
				source.currency,
			);
			const prompt = source.text
				? `<email-body>${source.text}</email-body>`
				: 'Please Extract from Attachment';
			const expensesRaw = await this.askLLM(
				systemPrompt,
				prompt,
				source.attachments,
			);
			const expenses: ExpenseEntity[] = [];

			for (const expense of expensesRaw) {
				const expenseEntity = await this.expenseRepository.create();
				expenseEntity.name = expense.name;
				expenseEntity.expendedCents = expense.expendedCents;
				expenseEntity.taxCents = expense.taxCents;
				expenseEntity.expendedAt = expense.expendedAt;
				expenseEntity.description = expense.description;
				expenseEntity.notes = expense.notes;
				expenseEntity.categoryId = expense.categoryId;

				await this.expenseRepository.save(expenseEntity);

				expenses.push(expenseEntity);
			}

			this.logger.info('Expense extraction completed', {
				extractedCount: expenses.length,
			});

			return { expenses };
		} catch (error) {
			this.logger.error('Expense extraction failed', {
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	private async loadData() {
		const expenseSettings = await this.settingsRepository.getSetting(
			ExpenseSettingsEntity,
		);
		const categories = expenseSettings?.categories || [];

		return { categories };
	}

	private async askLLM(
		systemPrompt: string,
		prompt: string,
		files: {
			name: string;
			content: Buffer;
			mimeType: string;
		}[],
	) {
		const llmResponse = await this.llmService.sendRequest({
			systemPrompt,
			prompt,
			files: files.length > 0 ? files : undefined,
			temperature: 0.1,
			maxTokens: 10000,
		});

		return this.parseLLMResponse(llmResponse.content);
	}

	/**
	 * Parse LLM response to extract expense items
	 */
	private parseLLMResponse(response: string): ExtractedExpenseItem[] {
		try {
			// Try to extract JSON from the response
			const jsonMatch = response.match(/\[[\S\s]*]/);
			if (!jsonMatch) {
				throw new Error('No JSON array found in response');
			}

			const parsed = JSON.parse(jsonMatch[0]) as ExtractedExpenseItem[];

			// Validate and transform the parsed data
			return parsed.map((item) => ({
				name: item.name,
				expendedCents: Math.round(item.expendedCents),
				taxCents: Math.round(item.taxCents || 0),
				expendedAt: new Date(item.expendedAt),
				description: item.description,
				notes: item.notes,
				categoryId: item.categoryId,
			}));
		} catch (error) {
			this.logger.error('Failed to parse LLM response', {
				response,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new Error(
				`Failed to parse LLM response: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
}

import { ExpenseEntity } from '@/backend/entities/expense.entity';

export interface ReceiptResult {
	expenses: ExpenseEntity[];
}

export interface ReceiptExtractorService {
	extract(source: {
		text: string;
		attachments: { content: Buffer; name: string; mimeType: string }[];
	}): Promise<ReceiptResult>;
}

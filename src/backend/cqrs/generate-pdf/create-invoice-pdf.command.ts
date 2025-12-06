import type { InvoiceEntity } from '@/backend/entities/invoice.entity';
import { CqrsCommandType, ICqrsCommand } from '@/backend/services/cqrs.service';

export class CreateInvoicePdfCommand extends ICqrsCommand<
	{
		html: string;
		invoice: InvoiceEntity;
		key?: string;
	},
	{
		success: boolean;
		region: string;
		bucket: string;
		key: string;
		pdf: Buffer;
	}
> {
	public static type = CqrsCommandType.Command;
}

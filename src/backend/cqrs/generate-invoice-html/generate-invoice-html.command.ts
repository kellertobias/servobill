import { InvoiceEntity } from '@/backend/entities/invoice.entity';
import { CompanyDataSetting } from '@/backend/entities/settings.entity';
import { CqrsCommandType, ICqrsCommand } from '@/backend/services/cqrs.service';
import { ObjectProperties } from '@/common/ts-helpers';

export class GenerateInvoiceHtmlCommand extends ICqrsCommand<
	{
		noWrap?: boolean;
		template: string;
		styles: string;
		logoUrl: string;
		company: CompanyDataSetting['companyData'];
		invoice: Omit<
			ObjectProperties<InvoiceEntity>,
			| 'id'
			| 'createdAt'
			| 'updatedAt'
			| 'activity'
			| 'pdf'
			| 'links'
			| 'submissions'
			| 'status'
			| 'customer'
			| 'contentHash'
			| 'events'
		> &
			Partial<Pick<InvoiceEntity, 'status'>> & {
				customer: Omit<
					ObjectProperties<InvoiceEntity['customer']>,
					'id' | 'createdAt' | 'updatedAt' | 'notes' | 'events'
				>;
			};
	},
	{
		html: string;
	}
> {
	public static type = CqrsCommandType.Command;
}

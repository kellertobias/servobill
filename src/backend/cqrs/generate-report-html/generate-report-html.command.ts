import type { IncomeSurplusReport } from '@/backend/api/graphql/reports/reports.schema';
import type { CompanyDataSetting } from '@/backend/entities/settings.entity';
import { CqrsCommandType, ICqrsCommand } from '@/backend/services/cqrs.service';

export class GenerateReportHtmlCommand extends ICqrsCommand<
	{
		title: string;
		template: string;
		styles: string;
		company: CompanyDataSetting['companyData'];
		report: IncomeSurplusReport;
	},
	{
		html: string;
	}
> {
	public static type = CqrsCommandType.Command;
}

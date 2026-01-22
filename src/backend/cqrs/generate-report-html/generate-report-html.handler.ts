import dayjs from 'dayjs';
import * as handlebars from 'handlebars';
import { Span } from '@/backend/instrumentation';
import {
	CqrsHandler,
	type ICqrsHandler,
} from '@/backend/services/cqrs.service';
import { centsToPrice } from '@/common/money';
import { GenerateReportHtmlCommand } from './generate-report-html.command';

const makeTemplate = (template: string, styles: string) => {
	return `
	<!DOCTYPE html>
	<html lang="en" style="width: 210mm; height: 295mm; padding: 0; margin: 0;">
	  <head>
		<meta charset="UTF-8" />
	  </head>
	  <style>
		${styles}
	  </style>
	  <body style="width: 210mm; height: 295mm; padding: 0; margin: 0;">
		${template}
	  </body>
	</html>
`;
};

@CqrsHandler(GenerateReportHtmlCommand)
export class GenerateReportHtmlHandler
	implements ICqrsHandler<GenerateReportHtmlCommand>
{
	private buildData(command: GenerateReportHtmlCommand['request']) {
		return {
			title: command.title,
			start: command.report.startDate,
			end: command.report.endDate,
			company: command.company,
			stats: {
				income: `${centsToPrice(command.report.incomeCents)}€`,
				expenses: `${centsToPrice(command.report.expensesCents)}€`,
				surplus: `${centsToPrice(command.report.surplusCents)}€`,
				tax: {
					invoices: `${centsToPrice(command.report.invoiceTaxCents)}€`,
					expenses: `${centsToPrice(command.report.expensesTaxCents)}€`,
				},
				overdue: {
					total: `${centsToPrice(command.report.overdueCents)}€`,
					count: command.report.overdueInvoices,
				},
				open: {
					total: `${centsToPrice(command.report.openCents)}€`,
					count: command.report.openInvoices,
				},
			},
			categorizedItems: this.groupItemsByCategory(command.report.items),
			sortedItems: command.report.items
				.slice()
				.sort((a, b) => a.valutaDate.getTime() - b.valutaDate.getTime())
				.map((item) => ({
					...item,
					surplus: `${centsToPrice(item.surplusCents)}€`,
					tax: `${centsToPrice(item.taxCents)}€`,
				})),
			items: command.report.items.map((item) => ({
				...item,
				surplus: `${centsToPrice(item.surplusCents)}€`,
				tax: `${centsToPrice(item.taxCents)}€`,
			})),
		};
	}

	private groupItemsByCategory(
		items: GenerateReportHtmlCommand['request']['report']['items'],
	) {
		const groups = new Map<
			string,
			{
				name: string;
				items: any[];
				totalIncome: number;
				totalExpense: number;
				totalSurplus: number;
				totalTax: number;
			}
		>();

		for (const item of items) {
			const catId = item.category?.id || 'uncategorized';
			const catName = item.category?.name || 'Uncategorized';

			if (!groups.has(catId)) {
				groups.set(catId, {
					name: catName,
					items: [],
					totalIncome: 0,
					totalExpense: 0,
					totalSurplus: 0,
					totalTax: 0,
				});
			}

			const group = groups.get(catId)!;

			if (item.surplusCents >= 0) {
				group.totalIncome += item.surplusCents;
			} else {
				group.totalExpense += item.surplusCents;
			}
			group.totalSurplus += item.surplusCents;
			if (item.taxCents) {
				group.totalTax += item.taxCents;
			}

			// Add item to group
			group.items.push({
				...item,
				surplus: `${centsToPrice(item.surplusCents)}€`,
				tax: `${centsToPrice(item.taxCents)}€`,
			});
		}

		// Sort items within groups
		for (const group of groups.values()) {
			group.items.sort(
				(a, b) => a.valutaDate.getTime() - b.valutaDate.getTime(),
			);
		}

		const sortedGroups = Array.from(groups.values()).sort((a, b) =>
			a.name.localeCompare(b.name),
		);

		// Format totals
		return sortedGroups.map((group) => ({
			...group,
			totalIncome: `${centsToPrice(group.totalIncome)}€`,
			totalExpense: `${centsToPrice(group.totalExpense)}€`,
			totalSurplus: `${centsToPrice(group.totalSurplus)}€`,
			totalTax: `${centsToPrice(group.totalTax)}€`,
		}));
	}

	private registerHelpers() {
		handlebars.registerHelper('date', (date, format) => {
			if (!date) {
				return 'Invalid date';
			}
			return dayjs(date).format(
				typeof format === 'string' && format ? format : 'DD.MM.YYYY',
			);
		});

		handlebars.registerHelper('price', (cents) => {
			return `${centsToPrice(cents)}€`;
		});

		handlebars.registerHelper('currency', (cents) => {
			if (typeof cents === 'number') {
				return `${centsToPrice(cents)}€`;
			}
			return cents; // Assuming already formatted string
		});
		handlebars.registerHelper(
			'nl2br',
			(text: string) =>
				new handlebars.SafeString(`${text || ''}`.replaceAll('\n', '<br />')),
		);
	}

	@Span('GenerateReportHtmlHandler.execute')
	async execute(command: GenerateReportHtmlCommand['request']) {
		const template = makeTemplate(command.template, command.styles);

		this.registerHelpers();

		const compiledTemplate = handlebars.compile(template);
		const data = this.buildData(command);
		const html = compiledTemplate(data);

		return {
			html,
		};
	}
}

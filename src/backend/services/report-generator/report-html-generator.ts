import dayjs from 'dayjs';
import * as handlebars from 'handlebars';
import { API } from '@/api/index';
import { Service } from '@/common/di';

export interface ReportItem {
	id: string;
	type: string;
	name: string;
	description?: string;
	valutaDate: Date;
	surplusCents: number;
	taxCents?: number;
	category?: {
		id: string;
		name: string;
		color?: string;
		description?: string;
	};
}

export interface ReportData {
	incomeCents: number;
	expensesCents: number;
	surplusCents: number;
	expensesTaxCents: number;
	items: ReportItem[];
}

@Service()
export class ReportHtmlGenerator {
	constructor() {
		this.registerHelpers();
	}

	private registerHelpers() {
		handlebars.registerHelper('date', (date) => {
			return dayjs(date).format('DD.MM.YYYY');
		});
		handlebars.registerHelper('currency', (cents) => {
			return `${(cents / 100).toFixed(2)} €`;
		});
	}

	public generateReportHtml(
		data: ReportData,
		format: 'simple' | 'categorized',
		dateRange: { start: Date; end: Date },
	): string {
		const template = format === 'simple' ? this.getSimpleTemplate() : this.getCategorizedTemplate();
		const compiled = handlebars.compile(template);

		// Pre-process data if needed
		const context = {
			...data,
			startDate: dateRange.start,
			endDate: dateRange.end,
			// For categorized report, we might need to group items here or in the template
			// Handlebars is logic-less, so better to group here if format is categorized
			categorizedItems: format === 'categorized' ? this.groupItemsByCategory(data.items) : undefined,
            sortedItems: format === 'simple' ? data.items.sort((a, b) => a.valutaDate.getTime() - b.valutaDate.getTime()) : undefined
		};

		return compiled(context);
	}

	private groupItemsByCategory(items: ReportItem[]) {
		const groups = new Map<string, {
			name: string,
			items: ReportItem[],
			totalIncome: number,
			totalExpense: number,
			totalSurplus: number,
			totalTax: number
		}>();

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
					totalTax: 0
				});
			}

			const group = groups.get(catId)!;
			group.items.push(item);

			if (item.surplusCents >= 0) {
				group.totalIncome += item.surplusCents;
			} else {
				group.totalExpense += item.surplusCents;
			}
			group.totalSurplus += item.surplusCents;
			if (item.taxCents) {
				group.totalTax += item.taxCents;
			}
		}

        // Sort items within groups
        for (const group of groups.values()) {
            group.items.sort((a, b) => a.valutaDate.getTime() - b.valutaDate.getTime());
        }

		return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
	}

	private getBaseCss() {
		return `
			body { font-family: sans-serif; padding: 20px; }
			h1 { font-size: 24px; margin-bottom: 10px; }
			h2 { font-size: 18px; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
			table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
			th, td { text-align: left; padding: 8px; border-bottom: 1px solid #eee; }
			th { background-color: #f9f9f9; }
			.text-right { text-align: right; }
			.summary { margin-bottom: 30px; background: #f5f5f5; padding: 15px; border-radius: 4px; }
			.summary-item { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; background: #eee; }
		`;
	}

	private getSimpleTemplate() {
		return `
		<!DOCTYPE html>
		<html>
		<head>
			<style>${this.getBaseCss()}</style>
		</head>
		<body>
			<h1>Financial Report</h1>
			<p>{{date startDate}} - {{date endDate}}</p>

			<div class="summary">
				<div class="summary-item"><strong>Total Revenue:</strong> <span>{{currency incomeCents}}</span></div>
				<div class="summary-item"><strong>Total Expenses:</strong> <span>{{currency expensesCents}}</span></div>
				<div class="summary-item"><strong>Total Profit:</strong> <span>{{currency surplusCents}}</span></div>
				<div class="summary-item"><strong>Total Expended Tax:</strong> <span>{{currency expensesTaxCents}}</span></div>
			</div>

			<table>
				<thead>
					<tr>
						<th>Date</th>
						<th>Title</th>
						<th>Description</th>
						<th>Category</th>
						<th class="text-right">Amount</th>
					</tr>
				</thead>
				<tbody>
					{{#each sortedItems}}
					<tr>
						<td>{{date valutaDate}}</td>
						<td>{{name}}</td>
						<td>{{description}}</td>
						<td>
                            {{#if category}}
                            <span class="badge" style="background-color: {{category.color}}20; color: {{category.color}}">{{category.name}}</span>
                            {{else}}
                            <span class="badge">Uncategorized</span>
                            {{/if}}
                        </td>
						<td class="text-right">{{currency surplusCents}}</td>
					</tr>
					{{/each}}
				</tbody>
			</table>
		</body>
		</html>
		`;
	}

	private getCategorizedTemplate() {
		return `
		<!DOCTYPE html>
		<html>
		<head>
			<style>${this.getBaseCss()}</style>
		</head>
		<body>
			<h1>Financial Report (Categorized)</h1>
			<p>{{date startDate}} - {{date endDate}}</p>

			<div class="summary">
				<div class="summary-item"><strong>Total Revenue:</strong> <span>{{currency incomeCents}}</span></div>
				<div class="summary-item"><strong>Total Expenses:</strong> <span>{{currency expensesCents}}</span></div>
				<div class="summary-item"><strong>Total Profit:</strong> <span>{{currency surplusCents}}</span></div>
				<div class="summary-item"><strong>Total Expended Tax:</strong> <span>{{currency expensesTaxCents}}</span></div>
			</div>

			{{#each categorizedItems}}
			<h2>{{name}}</h2>
			<div class="summary" style="padding: 10px; font-size: 12px; margin-bottom: 10px;">
				Income: {{currency totalIncome}} | Expenses: {{currency totalExpense}} | Total: <strong>{{currency totalSurplus}}</strong> | Tax: {{currency totalTax}}
			</div>
			<table>
				<thead>
					<tr>
						<th>Date</th>
						<th>Title</th>
						<th>Description</th>
						<th class="text-right">Amount</th>
						<th class="text-right">Tax</th>
					</tr>
				</thead>
				<tbody>
					{{#each items}}
					<tr>
						<td>{{date valutaDate}}</td>
						<td>{{name}}</td>
						<td>{{description}}</td>
						<td class="text-right">{{currency surplusCents}}</td>
						<td class="text-right">{{#if taxCents}}{{currency taxCents}}{{else}}-{{/if}}</td>
					</tr>
					{{/each}}
				</tbody>
			</table>
			{{/each}}
		</body>
		</html>
		`;
	}
}

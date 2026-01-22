export const BASE_CSS = `
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

export const SIMPLE_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
	<style>{{styles}}</style>
</head>
<body>
	<h1>{{title}}</h1>
	<p>{{date start}} - {{date end}}</p>

	<div class="summary">
		<div class="summary-item"><strong>Total Revenue:</strong> <span>{{stats.income}}</span></div>
		<div class="summary-item"><strong>Total Expenses:</strong> <span>{{stats.expenses}}</span></div>
		<div class="summary-item"><strong>Total Profit:</strong> <span>{{stats.surplus}}</span></div>
		<div class="summary-item"><strong>Total Expended Tax:</strong> <span>{{stats.tax.expenses}}</span></div>
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
				<td class="text-right">{{surplus}}</td>
			</tr>
			{{/each}}
		</tbody>
	</table>
</body>
</html>
`;

export const CATEGORIZED_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
	<style>{{styles}}</style>
</head>
<body>
	<h1>{{title}}</h1>
	<p>{{date start}} - {{date end}}</p>

	<div class="summary">
		<div class="summary-item"><strong>Total Revenue:</strong> <span>{{stats.income}}</span></div>
		<div class="summary-item"><strong>Total Expenses:</strong> <span>{{stats.expenses}}</span></div>
		<div class="summary-item"><strong>Total Profit:</strong> <span>{{stats.surplus}}</span></div>
		<div class="summary-item"><strong>Total Expended Tax:</strong> <span>{{stats.tax.expenses}}</span></div>
	</div>

	{{#each categorizedItems}}
	<h2>{{name}}</h2>
	{{#if description}}
	<p style="margin-top: 5px; margin-bottom: 10px; color: #666; font-size: 13px;">{{description}}</p>
	{{/if}}
	{{#if reference}}
	<p style="margin-top: 5px; margin-bottom: 10px; color: #666; font-size: 12px;"><strong>Reference:</strong> {{reference}}</p>
	{{/if}}
	<div class="summary" style="padding: 10px; font-size: 12px; margin-bottom: 10px;">
		Income: {{totalIncome}} | Expenses: {{totalExpense}} | Total: <strong>{{totalSurplus}}</strong> | Tax: {{totalTax}}
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
				<td class="text-right">{{surplus}}</td>
				<td class="text-right">{{#if taxCents}}{{tax}}{{else}}-{{/if}}</td>
			</tr>
			{{/each}}
		</tbody>
	</table>
	{{/each}}
</body>
</html>
`;

export const EMAIL_TEMPLATE = `
<p>Hello,</p>
<p>Please find attached your requested financial report.</p>
<p>Format: {{format}}</p>
<p>Period: {{startDate}} - {{endDate}}</p>
`;

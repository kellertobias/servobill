import { ReceiptEvent } from './event';

import type { ExpenseEntity } from '@/backend/entities/expense.entity';

/**
 * Helper function to format currency from cents to display format
 * Accepts a currency code (ISO 4217)
 */
const formatCurrency = (cents: number, currency: string): string => {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
	}).format(cents / 100);
};

/**
 * Helper function to format dates for display
 */
const formatDate = (date: Date): string => {
	return new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	}).format(date);
};

/**
 * Generate HTML content for the expenses summary email
 *
 * Creates a professional, responsive email template with:
 * - Summary section with processing statistics
 * - List of processed files
 * - Detailed table of extracted expenses
 * - Fallback message if no expenses were extracted
 *
 * @param expenses Array of extracted expense entities
 * @param attachments Array of processed attachments
 * @param event The receipt event that was processed
 * @param currency The currency code to use for formatting
 * @returns Complete HTML email content
 */
export function generateExpensesSummaryHtml(
	expenses: ExpenseEntity[],
	attachments: { content: Buffer; mimeType: string; name: string }[],
	event: ReceiptEvent,
	currency: string,
): string {
	const totalAmount = expenses.reduce(
		(sum, expense) => sum + expense.expendedCents,
		0,
	);
	const totalTax = expenses.reduce(
		(sum, expense) => sum + (expense.taxCents || 0),
		0,
	);

	const expensesTableRows = expenses
		.map(
			(expense) => `
				<tr>
					<td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${expense.name}</td>
					<td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(
						expense.expendedCents,
						currency,
					)}</td>
					<td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(
						expense.taxCents || 0,
						currency,
					)}</td>
					<td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${formatDate(
						expense.expendedAt,
					)}</td>
					<td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${
						expense.description || '-'
					}</td>
				</tr>
			`,
		)
		.join('');

	const attachmentsList = attachments
		.map((attachment) => `<li>${attachment.name}</li>`)
		.join('');

	return `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="utf-8">
			<title>Receipt Processing Summary</title>
		</head>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
			<h1 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
				Receipt Processing Complete
			</h1>
			
			<div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
				<h2 style="margin-top: 0; color: #1e293b;">Summary</h2>
				<p><strong>Event ID:</strong> ${event.id}</p>
				<p><strong>Processed Files:</strong> ${attachments.length}</p>
				<p><strong>Extracted Expenses:</strong> ${expenses.length}</p>
				<p><strong>Total Amount:</strong> ${formatCurrency(totalAmount, currency)}</p>
				<p><strong>Total Tax:</strong> ${formatCurrency(totalTax, currency)}</p>
			</div>

			${
				attachments.length > 0
					? `
				<div style="margin: 20px 0;">
					<h3 style="color: #1e293b;">Processed Files:</h3>
					<ul style="list-style-type: disc; margin-left: 20px;">
						${attachmentsList}
					</ul>
				</div>
			`
					: ''
			}

			${
				expenses.length > 0
					? `
				<div style="margin: 20px 0;">
					<h3 style="color: #1e293b;">Extracted Expenses:</h3>
					<table style="width: 100%; border-collapse: collapse; margin-top: 10px; background-color: white; border: 1px solid #e5e7eb;">
						<thead>
							<tr style="background-color: #f8fafc;">
								<th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: bold;">Name</th>
								<th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #e5e7eb; font-weight: bold;">Amount</th>
								<th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #e5e7eb; font-weight: bold;">Tax</th>
								<th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: bold;">Date</th>
								<th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: bold;">Description</th>
							</tr>
						</thead>
						<tbody>
							${expensesTableRows}
						</tbody>
					</table>
				</div>
			`
					: `
				<div style="margin: 20px 0; padding: 15px; background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px;">
					<p style="margin: 0; color: #92400e;"><strong>Note:</strong> No expenses were extracted from the processed files.</p>
				</div>
			`
			}

			<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">
				<p>This email was automatically generated by Servobill after processing receipt files.</p>
				<p>Processed at: ${new Date().toLocaleString()}</p>
			</div>
		</body>
		</html>
	`;
}

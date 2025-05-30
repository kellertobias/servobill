/* eslint-disable @typescript-eslint/no-explicit-any */
import dayjs from 'dayjs';

import { doToast } from '@/components/toast';

import { API, gql } from '../index';

import { downloadFile, requestFile } from './helper';

export const importExpenses = async () => {
	const raw = await requestFile();
	doToast({
		promise: (async () => {
			const data = JSON.parse(raw || '{}');
			const expenses = data?.expenses || [];
			for (const expense of expenses) {
				if (expense.deleted_at) {
					continue;
				}
				await API.query({
					query: gql(`
						mutation ImportExpense($data: ExpenseInput!) {
							createExpense(data: $data) {
								id
							}
						}
					`),
					variables: {
						data: {
							name:
								expense.name ||
								`${expense.public_notes}`.trim().slice(0, 64) ||
								`Expense ${expense.date}`,
							description: expense.description || expense.public_notes || '',
							notes: expense.notes || expense.private_notes || '',
							expendedCents:
								expense.expendedCents || API.priceToCents(expense.amount),
							expendedAt:
								expense.expendedAt ||
								dayjs(
									expense.payment_date || expense.date,
									'YYYY-MM-DD',
								).toDate(),
							taxCents: expense.taxCents || 0,
							categoryId: expense.category_id || '',
						},
					},
				});
			}
		})(),
		loading: 'Importing Expenses...',
		success: 'Expenses Imported!',
		error: 'Failed to import your Expenses.',
	});
};

export const exportExpenses = async () => {
	doToast({
		promise: (async () => {
			const { expenses } = await API.query({
				query: gql(`
					query ExportExpenses {
						expenses {
							id
							name
							description
							notes
							expendedCents
							expendedAt
							taxCents
							createdAt
							updatedAt
							categoryId
						}
					}
				`),
			});

			const data = {
				expenses,
			};

			const dataStr = JSON.stringify(data);
			downloadFile({
				content: dataStr,
				filename: 'expenses.json',
			});
		})(),
		loading: 'Exporting Expenses...',
		success: 'Expenses Exported!',
		error: 'Failed to export your Expenses.',
	});
};

/* eslint-disable @typescript-eslint/no-explicit-any */

import { doToast } from '@/components/toast';

import { API, gql } from '../index';

import { downloadFile } from './helper';

export const exportInvoices = async () => {
	doToast({
		promise: (async () => {
			const { invoices } = await API.query({
				query: gql(`
					query ExportInvoices {
						invoices {
							id
							invoiceNumber
							offerNumber
							invoicedAt
							offeredAt
							dueAt
							status
							type
							subject
							footerText
							customer {
								id
								name
								contactName
								customerNumber
								email
								street
								zip
								city
								country
								state
								notes
								showContact
							}
							items {
								id
								name
								description
								quantity
								priceCents
								taxPercentage
								linkedExpenses {
									name
									price
									categoryId
									enabled
									expenseId
								}
							}
							createdAt
							updatedAt
						}
					}
				`),
			});

			const data = {
				invoices,
			};

			const dataStr = JSON.stringify(data);

			downloadFile({
				content: dataStr,
				filename: 'invoices.json',
			});
		})(),
		loading: 'Exporting Invoices...',
		success: 'Invoices Exported!',
		error: 'Failed to export your Invoices.',
	});
};

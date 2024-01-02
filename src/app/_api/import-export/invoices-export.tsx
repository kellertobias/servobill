/* eslint-disable @typescript-eslint/no-explicit-any */

import { doToast } from '@/components/toast';

import { API, gql } from '../index';

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
			const dataUri =
				'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

			const exportFileDefaultName = 'invoices.json';

			const linkElement = document.createElement('a');
			linkElement.setAttribute('href', dataUri);
			linkElement.setAttribute('download', exportFileDefaultName);
			linkElement.click();
		})(),
		loading: 'Exporting Invoices...',
		success: 'Invoices Exported!',
		error: 'Failed to export your Invoices.',
	});
};

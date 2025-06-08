import { doToast } from '@/components/toast';

import { API, gql } from '../index';

import { requestFile } from './helper';
import { loadInvoiceImportData } from './invoices-import-helper';

import { DeferredPromise } from '@/common/deferred';

export const importInvoices = async () => {
	const raw = await requestFile();
	const data = JSON.parse(raw || '{}');
	const waitForImport = new DeferredPromise();

	doToast({
		promise: (async () => {
			console.log(data);
			console.log('Starting Rewriting data');
			const invoices = await loadInvoiceImportData(data);

			console.log('Data rewritten', invoices);

			try {
				await API.query({
					query: gql(`
					mutation ImportInvoices($invoices: [InvoiceImportInput!]!) {
						importInvoices(data: $invoices) {
							id
						}
					}
				`),
					variables: { invoices },
				});
				console.log('API call finished');
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error(error);
				throw error;
			}
			waitForImport.resolve();
		})(),
		loading: 'Importing Invoices...',
		success: 'Invoices Imported!',
		error: 'Failed to import your Invoices.',
	});
	await waitForImport.promise;
};

import { DeferredPromise } from '@/common/deferred';
import { doToast } from '@/components/toast';
import { API, gql } from '../index';
import { requestFile } from './helper';
import { loadInvoiceImportData } from './invoices-import-helper';

export const importInvoices = async () => {
	const raw = await requestFile();
	const data = JSON.parse(raw || '{}');
	const waitForImport = new DeferredPromise();

	doToast({
		promise: (async () => {
			const invoices = await loadInvoiceImportData(data);

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

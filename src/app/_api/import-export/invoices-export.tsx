/* eslint-disable @typescript-eslint/no-explicit-any */

import { doToast } from '@/components/toast';

import { downloadFile } from './helper';
import { Exporters } from './exporters/exporters';

export const exportInvoices = async () => {
	doToast({
		promise: (async () => {
			const invoices = await Exporters.invoices();

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

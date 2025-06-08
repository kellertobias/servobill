/* eslint-disable @typescript-eslint/no-explicit-any */
import { doToast } from '@/components/toast';

import { API, gql } from '../index';

import { downloadFile, requestFile } from './helper';
import { Exporters } from './exporters/exporters';

import { DeferredPromise } from '@/common/deferred';

export const importSettings = async () => {
	const raw = await requestFile();
	const data = JSON.parse(raw || '{}');
	const { settings, template } = data;
	const { categories, ...globalSettings } = settings;

	const waitForImport = new DeferredPromise();
	doToast({
		promise: (async () => {
			const result = await API.query({
				query: gql(`
					mutation ImportSettings($settings: SettingsInput!, $template: InvoiceTemplateInput!) {
						updateSettings(data: $settings) {
							invoiceNumbersLast
						}
						updateTemplate(data: $template) {
							pdfStyles
						}
					}
				`),
				variables: {
					settings: globalSettings,
					template,
				},
			});
			waitForImport.resolve();
			return result;
		})(),
		loading: 'Importing Settings...',
		success: 'Settings Imported!',
		error: 'Failed to import your Settings.',
	});
	await waitForImport.promise;
};

export const exportSettings = async () => {
	doToast({
		promise: (async () => {
			const data = await Exporters.settings();

			const dataStr = JSON.stringify(data);

			downloadFile({
				content: dataStr,
				filename: 'settings.json',
			});
		})(),
		loading: 'Exporting Settings...',
		success: 'Settings Exported!',
		error: 'Failed to export your Settings.',
	});
};

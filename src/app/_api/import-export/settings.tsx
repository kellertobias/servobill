/* eslint-disable @typescript-eslint/no-explicit-any */
import { doToast } from '@/components/toast';

import { API, gql } from '../index';

import { requestFile } from './helper';

export const importSettings = async () => {
	const raw = await requestFile();
	const data = JSON.parse(raw || '{}');
	doToast({
		promise: (async () =>
			await API.query({
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
				variables: data,
			}))(),
		loading: 'Importing Settings...',
		success: 'Settings Imported!',
		error: 'Failed to import your Settings.',
	});
};

export const exportSettings = async () => {
	doToast({
		promise: (async () => {
			const data = await API.query({
				query: gql(`
					query ExportSettings {
						settings {
							invoiceNumbersTemplate
							invoiceNumbersIncrementTemplate
							invoiceNumbersLast
							offerNumbersTemplate
							offerNumbersIncrementTemplate
							offerNumbersLast
							customerNumbersTemplate
							customerNumbersIncrementTemplate
							customerNumbersLast
							emailTemplate
							emailSubjectInvoices
							emailSubjectOffers
							emailSubjectReminder
							emailSubjectWarning
							sendFrom
							replyTo
							invoiceCompanyLogo
							emailCompanyLogo
							offerValidityDays
							defaultInvoiceDueDays
							defaultInvoiceFooterText
							company {
								name
								street
								zip
								city
								taxId
								vatId
								email
								phone
								web
								bankAccountHolder
								bankIban
								bankBic
							}
						}
						template {
							pdfTemplate
							pdfStyles
						}
					}
				`),
			});

			const dataStr = JSON.stringify(data);
			const dataUri =
				'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

			const exportFileDefaultName = 'settings.json';

			const linkElement = document.createElement('a');
			linkElement.setAttribute('href', dataUri);
			linkElement.setAttribute('download', exportFileDefaultName);
			linkElement.click();
		})(),
		loading: 'Exporting Settings...',
		success: 'Settings Exported!',
		error: 'Failed to export your Settings.',
	});
};

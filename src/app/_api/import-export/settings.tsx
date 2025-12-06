/* eslint-disable @typescript-eslint/no-explicit-any */

import { DeferredPromise } from '@/common/deferred';
import type { InvoiceTemplateResult, SettingsResult } from '@/common/gql/graphql';
import { doToast } from '@/components/toast';
import { API, gql } from '../index';
import { Exporters } from './exporters/exporters';
import { downloadFile, requestFile } from './helper';

export const importSettings = async () => {
  const raw = await requestFile();
  const data = JSON.parse(raw || '{}') as {
    settings: SettingsResult;
    template: InvoiceTemplateResult;
  };
  const { settings, template } = data;
  const { categories, ...globalSettings } = settings;

  const waitForImport = new DeferredPromise();
  doToast({
    promise: (async () => {
      const result = await API.query({
        query: gql(`
					mutation ImportSettings(
						$settings: SettingsInput!,
						$template: InvoiceTemplateInput!,
						$categories: [ExpenseCategoryInputType!]!
					) {
						updateSettings(data: $settings) {
							invoiceNumbersLast
						}
						updateTemplate(data: $template) {
							pdfStyles
						}
						updateExpenseSettings(categories: $categories, fixExpensesForImport: true) {
							id
						}
					}
				`),
        variables: {
          settings: globalSettings,
          template,
          categories: (categories || []).map((cat) => ({
            categoryId: cat.id,
            name: cat.name,
            description: cat.description,
            color: cat.color,
            isDefault: cat.isDefault,
            sumForTaxSoftware: cat.sumForTaxSoftware,
            reference: cat.reference,
          })),
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

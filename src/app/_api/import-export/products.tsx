/* eslint-disable @typescript-eslint/no-explicit-any */

import { DeferredPromise } from '@/common/deferred';
import { doToast } from '@/components/toast';
import { API, gql } from '../index';
import { Exporters } from './exporters/exporters';
import { downloadFile, requestFile } from './helper';

export const importProducts = async () => {
	const raw = await requestFile();
	const waitForImport = new DeferredPromise();
	doToast({
		promise: (async () => {
			const data = JSON.parse(raw || '{}');
			const products = data?.products || [];

			for (const product of products) {
				await API.query({
					query: gql(`
						mutation ImportProduct($data: ProductInput!) {
							createProduct(data: $data) {
								id
							}
						}
					`),
					variables: {
						data: {
							name: product.name || product.product_key,
							category: product.category || 'Generic',
							description:
								(product.product_key ? product.notes : product.description) ||
								'',
							notes: (product.product_key ? '' : product.notes) || '',
							priceCents: product.priceCents || API.priceToCents(product.price),
							taxPercentage: product.taxPercentage || 0,
							expenses: product.expenses || [],
						},
					},
				});
			}
			waitForImport.resolve();
		})(),
		loading: 'Importing Products...',
		success: 'Products Imported!',
		error: 'Failed to import your Products.',
	});
	await waitForImport.promise;
};

export const exportProducts = async () => {
	doToast({
		promise: (async () => {
			const products = await Exporters.products();

			const data = {
				products,
			};

			const dataStr = JSON.stringify(data);

			downloadFile({
				content: dataStr,
				filename: 'products.json',
			});
		})(),
		loading: 'Exporting Products...',
		success: 'Products Exported!',
		error: 'Failed to export your Products.',
	});
};

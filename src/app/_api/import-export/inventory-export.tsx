/* eslint-disable @typescript-eslint/no-explicit-any */

import { doToast } from '@/components/toast';
import { Exporters } from './exporters/exporters';
import { downloadFile } from './helper';

export const exportInventory = async () => {
	doToast({
		promise: (async () => {
			const inventory = await Exporters.inventory();

			const data = {
				inventory,
			};

			const dataStr = JSON.stringify(data);

			downloadFile({
				content: dataStr,
				filename: 'inventory.json',
			});
		})(),
		loading: 'Exporting Inventory...',
		success: 'Inventory Exported!',
		error: 'Failed to export your Inventory.',
	});
};

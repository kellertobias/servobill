import { SSTConfig } from 'sst';

import { Stack } from './stack';

export default {
	config() {
		return {
			name: 'invoices',
			region: 'eu-central-1',
		};
	},
	stacks(app) {
		app.stack(Stack);
	},
} satisfies SSTConfig;

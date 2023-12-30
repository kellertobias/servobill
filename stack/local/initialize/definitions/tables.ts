import { TableProps } from 'sst/constructs';

export const tableDefinitions = {
	electrodb: {
		fields: {
			pk: 'string',
			sk: 'string',
			gsi1pk: 'string',
			gsi1sk: 'string',
		},
		primaryIndex: {
			partitionKey: 'pk',
			sortKey: 'sk',
		},
		globalIndexes: {
			'gsi1pk-gsi1sk-index': {
				partitionKey: 'gsi1pk',
				sortKey: 'gsi1sk',
				projection: 'all',
			},
		},
	},
} satisfies Record<string, TableProps>;

import { Bucket, StackContext, Table } from 'sst/constructs';

import { tableDefinitions } from './local/initialize/definitions/tables';

function makeTables(stack: StackContext['stack']) {
	const tables = {} as Record<keyof typeof tableDefinitions, Table>;

	for (const [tableName, tableDefinition] of Object.entries(tableDefinitions)) {
		const table = new Table(stack, tableName, {
			fields: tableDefinition.fields,
			primaryIndex: tableDefinition.primaryIndex,
			globalIndexes: tableDefinition.globalIndexes,
		});
		tables[tableName as keyof typeof tableDefinitions] = table;
	}

	return tables;
}

export const getDataResources = ({ stack }: StackContext) => {
	const tables = makeTables(stack);
	const buckets = {
		files: new Bucket(stack, 'files', {
			cors: true,
			...(process.env.BUCKETS_FILE_SST
				? {
						name: process.env.BUCKETS_FILE_SST,
					}
				: {}),
		}),
	};

	return {
		tables,
		buckets,
	};
};

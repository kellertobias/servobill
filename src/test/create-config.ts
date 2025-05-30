import { DatabaseType } from '@/backend/services/constants';
import { DYNAMODB_TABLE_NAME } from './ensure-dynamo-table';
import {
	DYNAMODB_PORT,
	POSTGRES_DB,
	POSTGRES_PASSWORD,
	POSTGRES_PORT,
	POSTGRES_USER,
} from './vitest.setup-e2e';

/**
 * Returns a minimal config object for DynamoDB-based tests.
 */
export function getConfigForDynamodb(
	tableName?: string,
	overrides: Partial<any> = {},
) {
	return {
		tables: {
			electordb: tableName ?? DYNAMODB_TABLE_NAME,
			databaseType: DatabaseType.DYNAMODB,
		},
		endpoints: {
			dynamodb: `http://localhost:${DYNAMODB_PORT}`,
		},
		region: 'eu-central-1',
		awsCreds: {
			accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
			secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
		},
		port: 0,
		domains: { api: '', site: '' },
		eventBusName: '',
		buckets: { files: '' },
		isLocal: true,
		ses: {
			accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
			secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
		},
		...overrides,
	};
}

/**
 * Returns a minimal config object for relational DB-based tests.
 */
export function getConfigForRelationalDb(overrides: Partial<any> = {}) {
	return {
		tables: {
			databaseType: DatabaseType.POSTGRES,
			postgres: `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}`,
		},
		endpoints: {
			dynamodb: `http://localhost:${DYNAMODB_PORT}`,
		},
		region: 'eu-central-1',
		awsCreds: {
			accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
			secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
		},
		port: 0,
		domains: { api: '', site: '' },
		eventBusName: '',
		buckets: { files: '' },
		isLocal: true,
		ses: {
			accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
			secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
		},
		...overrides,
	};
}

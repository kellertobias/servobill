import { DYNAMODB_TABLE_NAME } from './ensure-dynamo-table';
import {
	DYNAMODB_PORT,
	POSTGRES_DB,
	POSTGRES_PASSWORD,
	POSTGRES_PORT,
	POSTGRES_USER,
	S3_PORT,
} from './vitest.setup-e2e';

import {
	DatabaseType,
	EmailType,
	FileStorageType,
	EmailConfig,
} from '@/backend/services/constants';

/**
 * Returns a minimal config object for DynamoDB-based tests.
 */
export function getConfigForDynamodb(
	tableName?: string,
	overrides: Record<string, unknown> = {},
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
export function getConfigForRelationalDb(
	overrides: Record<string, unknown> = {},
) {
	return {
		tables: {
			databaseType: DatabaseType.POSTGRES,
			postgres: `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}`,
		},
		endpoints: {
			dynamodb: `http://localhost:${DYNAMODB_PORT}`,
			s3: `http://localhost:${S3_PORT}`,
			eventbridge: `http://localhost:1234`,
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
		fileStorage: {
			type: FileStorageType.LOCAL,
			baseDirectory: `/tmp/test-file-storage/${Date.now()}`,
		},
		email: {
			type: EmailType.SMTP,
			host: 'localhost',
			port: 1025,
			user: 'test',
			password: 'test',
			from: 'test@test.com',
		} satisfies EmailConfig,
		...overrides,
	};
}

import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	DatabaseType,
	type EmailConfig,
	EmailType,
	FileStorageType,
} from '@/backend/services/constants';
import { DYNAMODB_TABLE_NAME } from './ensure-dynamo-table';
import { SQLITE_TEST_FILE_PREFIX } from './sqlite-test-files';
import {
	DYNAMODB_PORT,
	POSTGRES_DB,
	POSTGRES_PASSWORD,
	POSTGRES_PORT,
	POSTGRES_USER,
	S3_PORT,
} from './vitest.setup-e2e';

/**
 * One SQLite file per test worker. The name starts with the pid of the
 * vitest main process, whose global teardown deletes them.
 */
const SQLITE_TEST_PATH = join(
	tmpdir(),
	`${SQLITE_TEST_FILE_PREFIX}${process.ppid}-${randomUUID()}.sqlite`,
);

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
		// VITEST_REPOTYPE=sqlite runs the relational tests against SQLite
		tables:
			process.env.VITEST_REPOTYPE === DatabaseType.SQLITE
				? {
						databaseType: DatabaseType.SQLITE,
						sqlite: SQLITE_TEST_PATH,
					}
				: {
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

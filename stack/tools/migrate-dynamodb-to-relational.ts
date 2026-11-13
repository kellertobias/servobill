/* eslint-disable no-console */
/**
 * Copies a serverless installation (DynamoDB) into Postgres or SQLite.
 *
 *   SOURCE_TABLE=<dynamodb table> AWS_PROFILE=<profile> AWS_REGION=eu-central-1 \
 *   TARGET_POSTGRES_URL=postgres://user:pw@host:5432/db \
 *   npm run migrate:dynamodb-to-relational -- [--dry-run] [--reset]
 *
 * Use TARGET_SQLITE_PATH instead of TARGET_POSTGRES_URL for SQLite.
 * SOURCE_DYNAMODB_ENDPOINT points to a local DynamoDB (optional).
 * SOURCE_BUCKET is the S3 bucket of the serverless installation: attachments
 * stored without a bucket name get it, so all files can be copied to
 * <files>/<bucket>/<key> (recommended).
 *
 * The DynamoDB table is only read. Files (S3) are not copied by this tool,
 * see docs/migrate-from-aws.md.
 *
 *   --dry-run  read and convert everything, write nothing
 *   --reset    empty the target tables first (exact copy, e.g. for the
 *              final switch-over after a test migration)
 */
import 'reflect-metadata';
// Must come first: the repositories register themselves based on the config
import '@/backend/services/config.service';
import '@/backend/repositories';

import { migrateDynamodbToRelational } from '@/backend/migrations/dynamodb-to-relational';
import { DatabaseType } from '@/backend/services/constants';
import {
	CONFIG_SERVICE,
	DYNAMODB_SERVICE,
	EVENTBUS_SERVICE,
	RELATIONALDB_SERVICE,
} from '@/backend/services/di-tokens';
import { DynamoDBService } from '@/backend/services/dynamodb.service';
import { RelationalDbService } from '@/backend/services/relationaldb.service';
import { App } from '@/common/di';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const reset = args.has('--reset');

const required = (name: string) => {
	const value = process.env[name];
	if (!value) {
		console.error(`Missing ${name}. See the header of this script.`);
		process.exit(2);
	}
	return value;
};

const sourceTable = required('SOURCE_TABLE');
const targetPostgres = process.env.TARGET_POSTGRES_URL;
const targetSqlite = process.env.TARGET_SQLITE_PATH;
if (!targetPostgres && !targetSqlite) {
	required('TARGET_POSTGRES_URL');
}

/** Saving entities may publish events; during a migration nothing is sent. */
const silentEventBus = { send: async () => 'not-sent' };

const baseConfig = {
	region: process.env.AWS_REGION || 'eu-central-1',
	// Empty: the AWS SDK uses AWS_PROFILE / the normal credential chain
	awsCreds: {},
	port: 0,
	domains: { api: '', site: '' },
	eventBusName: '',
	buckets: { files: '' },
	isLocal: true,
};

const source = App.forRoot({
	modules: [
		{
			token: CONFIG_SERVICE,
			value: {
				...baseConfig,
				tables: { databaseType: DatabaseType.DYNAMODB, electordb: sourceTable },
				endpoints: { dynamodb: process.env.SOURCE_DYNAMODB_ENDPOINT },
			},
		},
		{ token: DYNAMODB_SERVICE, module: DynamoDBService },
		{ token: EVENTBUS_SERVICE, value: silentEventBus },
	],
});

const target = App.forRoot({
	modules: [
		{
			token: CONFIG_SERVICE,
			value: {
				...baseConfig,
				tables: targetSqlite
					? { databaseType: DatabaseType.SQLITE, sqlite: targetSqlite }
					: { databaseType: DatabaseType.POSTGRES, postgres: targetPostgres },
				endpoints: {},
			},
		},
		{ token: RELATIONALDB_SERVICE, module: RelationalDbService },
		{ token: EVENTBUS_SERVICE, value: silentEventBus },
	],
});

console.log(
	`Copying DynamoDB table ${sourceTable} to ${targetSqlite ? 'SQLite' : 'Postgres'}` +
		`${dryRun ? ' (dry run, nothing is written)' : ''}${reset ? ' (target is emptied first)' : ''}`,
);

migrateDynamodbToRelational({
	source,
	target,
	reset,
	dryRun,
	filesBucket: process.env.SOURCE_BUCKET,
	log: console.log,
})
	.then((result) => {
		const mismatch = dryRun
			? []
			: result.filter((entry) => entry.inTarget < entry.read);
		if (mismatch.length > 0) {
			console.error(
				`Fewer rows in the target than read for: ${mismatch.map((m) => m.entity).join(', ')}`,
			);
			process.exit(1);
		}
		console.log('Done.');
		process.exit(0);
	})
	.catch((error) => {
		console.error('Migration failed:', error);
		process.exit(1);
	});

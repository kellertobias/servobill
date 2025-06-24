/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from 'node:crypto';

import { vi } from 'vitest';

import {
	getConfigForDynamodb,
	getConfigForRelationalDb,
} from './create-config';
import { ensureDynamoTableExists } from './ensure-dynamo-table';

import { DatabaseType } from '@/backend/services/constants';
import {
	CONFIG_SERVICE,
	DYNAMODB_SERVICE,
	EVENTBUS_SERVICE,
	RELATIONALDB_SERVICE,
} from '@/backend/services/di-tokens';
import { App } from '@/common/di';
import { DynamoDBService } from '@/backend/services/dynamodb.service';
import { RelationalDbService } from '@/backend/services/relationaldb.service';

interface PrepareRepoTestOptions<T> {
	name: string;
	relational: new (...args: any[]) => T;
	dynamodb: new (...args: any[]) => T;
	relationalOrmEntity: any;
}

/**
 * Prepares parameterized repo tests for both relational and dynamodb implementations.
 * Returns an array of { name, setup, onBeforeEach } for use with describe.each.
 *
 * @param options - { name, relational, dynamodb, modules }
 */
export function prepareRepoTest<T>({
	name,
	relational,
	dynamodb,
	relationalOrmEntity,
}: PrepareRepoTestOptions<T>) {
	const eventBusMock = {
		send: vi.fn().mockImplementation(() => {
			return Promise.resolve(randomUUID());
		}),
	};
	return [
		{
			dbType: DatabaseType.DYNAMODB,
			name: `${name}DynamodbRepository`,
			setup: async () => {
				const tableName = `${name}-${randomUUID()}`;
				const config = getConfigForDynamodb(tableName);
				const app = App.forRoot({
					modules: [
						{ token: CONFIG_SERVICE, value: config },
						{ token: DYNAMODB_SERVICE, module: DynamoDBService },
						{ token: EVENTBUS_SERVICE, value: eventBusMock },
					],
				});

				await ensureDynamoTableExists(tableName);

				return {
					app,
					RepositoryImplementation: dynamodb,
					repo: app.create<T>(dynamodb),
				};
			},
			onBeforeEach: async () => {},
		},
		{
			dbType: DatabaseType.POSTGRES,
			name: `${name}RelationalRepository`,
			setup: async () => {
				const { OrmEntityRegistry } = await import(
					'@/common/orm-entity-registry'
				);
				// eslint-disable-next-line @typescript-eslint/ban-types
				OrmEntityRegistry.push(relationalOrmEntity as Function);
				const config = getConfigForRelationalDb();
				const app = App.forRoot({
					modules: [
						{ token: CONFIG_SERVICE, value: config },
						{ token: RELATIONALDB_SERVICE, module: RelationalDbService },
						{ token: EVENTBUS_SERVICE, value: eventBusMock },
					],
				});
				return {
					app,
					RepositoryImplementation: relational,
					repo: app.create<T>(relational),
				};
			},
			onBeforeEach: async () => {
				// Optionally clear relational DB, etc.
				const config = getConfigForRelationalDb();
				const dbService = new RelationalDbService(config as any);
				await dbService.initialize();
				await dbService.dataSource.synchronize(true);
				await dbService.dataSource.destroy();
			},
		},
	].filter((test) => {
		if (!process.env.VITEST_REPOTYPE) {
			return true;
		}
		if (process.env.VITEST_REPOTYPE === 'all') {
			return true;
		}
		if (process.env.VITEST_REPOTYPE === test.dbType) {
			return true;
		}
		return false;
	});
}

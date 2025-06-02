/* eslint-disable @typescript-eslint/no-explicit-any */
import {
	getConfigForDynamodb,
	getConfigForRelationalDb,
} from './create-config';
import {
	DYNAMODB_TABLE_NAME,
	ensureDynamoTableExists,
} from './ensure-dynamo-table';
import { clearDynamoTable } from './clear-dynamo-table';
import { DYNAMODB_PORT } from './vitest.setup-e2e';

import { DatabaseType } from '@/backend/services/constants';
import { CONFIG_SERVICE } from '@/backend/services/di-tokens';
import { App, ModuleBinding } from '@/common/di';
import { DynamoDBService } from '@/backend/services/dynamodb.service';
import { RelationalDbService } from '@/backend/services/relationaldb.service';

interface PrepareRepoTestOptions<T> {
	name: string;
	relational: new (...args: any[]) => T;
	dynamodb: new (...args: any[]) => T;
	relationalOrmEntity: any;
	modules?: (dbType: DatabaseType) => ModuleBinding[];
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
	modules,
}: PrepareRepoTestOptions<T>) {
	return [
		{
			dbType: DatabaseType.DYNAMODB,
			name: `${name}DynamodbRepository`,
			setup: async () => {
				await ensureDynamoTableExists();

				const config = getConfigForDynamodb(DYNAMODB_TABLE_NAME);
				const app = App.forRoot({
					modules: [
						{ token: CONFIG_SERVICE, value: config },
						{ token: DynamoDBService, module: DynamoDBService },
						...(modules?.(DatabaseType.DYNAMODB) || []),
					],
				});
				return {
					app,
					RepositoryImplementation: dynamodb,
				};
			},
			onBeforeEach: async () => {
				await ensureDynamoTableExists();
				await clearDynamoTable({
					tableName: DYNAMODB_TABLE_NAME,
					port: DYNAMODB_PORT,
				});
			},
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
						{ token: RelationalDbService, module: RelationalDbService },

						...(modules?.(DatabaseType.POSTGRES) || []),
					],
				});
				return {
					app,
					RepositoryImplementation: relational,
				};
			},
			onBeforeEach: async () => {
				// Optionally clear relational DB, etc.
			},
		},
	];
}

import { App } from '@/common/di';
import { CONFIG_SERVICE } from '@/backend/services/di-tokens';
import {
	getConfigForDynamodb,
	getConfigForRelationalDb,
} from './create-config';
import { DatabaseType } from '@/backend/services/constants';
import {
	DYNAMODB_TABLE_NAME,
	ensureDynamoTableExists,
} from './ensure-dynamo-table';
import { clearDynamoTable } from './clear-dynamo-table';
import { DYNAMODB_PORT } from './vitest.setup-e2e';
import { DynamoDBService } from '@/backend/services/dynamodb.service';
import { RelationalDbService } from '@/backend/services/relationaldb.service';

interface PrepareRepoTestOptions {
	name: string;
	relational: any;
	dynamodb: any;
	relationalOrmEntity: any;
	dynamoEntity?: any;
	modules?: (dbType: DatabaseType) => any[];
}

/**
 * Prepares parameterized repo tests for both relational and dynamodb implementations.
 * Returns an array of { name, setup, onBeforeEach } for use with describe.each.
 *
 * @param options - { name, relational, dynamodb, dynamoEntity, modules }
 */
export function prepareRepoTest({
	name,
	relational,
	dynamodb,
	relationalOrmEntity,
	modules,
}: PrepareRepoTestOptions) {
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
				OrmEntityRegistry.push(relationalOrmEntity);
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

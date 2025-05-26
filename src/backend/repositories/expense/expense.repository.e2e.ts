// @vitest-environment node
// @vitest-execute serial

import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import { ExpenseEntity } from '@/backend/entities/expense.entity';
import { DatabaseType } from '@/backend/services/constants';
import { ExpenseDynamodbRepository } from './expense.dynamodb-repository';
import { ExpenseRelationalRepository } from './expense.relational-repository';
import { DynamoDBService } from '@/backend/services/dynamodb.service';
import { RelationalDbService } from '@/backend/services/relationaldb.service';
import { ExpenseOrmEntity } from './relational-orm-entity';
import {
	DYNAMODB_PORT,
	POSTGRES_PORT,
	POSTGRES_USER,
	POSTGRES_PASSWORD,
	POSTGRES_DB,
} from '@/test/vitest.setup-e2e';
import { App } from '@/common/di';
import { CONFIG_SERVICE } from '@/backend/services/di-tokens';
import {
	ensureDynamoTableExists,
	DYNAMODB_TABLE_NAME,
} from '@/test/ensure-dynamo-table';
import { ExpenseRepository } from './interface';
import { clearDynamoTable } from '@/test/clear-dynamo-table';

/**
 * Parameterized test suite for both repository implementations.
 */
describe.each([
	{
		dbType: DatabaseType.DYNAMODB,
		name: 'ExpenseDynamodbRepository',
		setup: async () => {
			await ensureDynamoTableExists();
			const config = {
				tables: {
					electordb: DYNAMODB_TABLE_NAME,
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
				ses: { accessKeyId: '', secretAccessKey: '' },
			};
			const app = App.forRoot({
				modules: [
					{ token: CONFIG_SERVICE, value: config },
					{ token: DynamoDBService, module: DynamoDBService },
					DynamoDBService,
				],
			});
			return {
				app,
				ExpenseRepositoryImplementation: ExpenseDynamodbRepository,
			};
		},
	},
	{
		dbType: DatabaseType.POSTGRES,
		name: 'ExpenseRelationalRepository',
		setup: async () => {
			const { OrmEntityRegistry } = await import(
				'@/common/orm-entity-registry'
			);
			OrmEntityRegistry.push(ExpenseOrmEntity);
			await new Promise((res) => setTimeout(res, 1000));
			const config = {
				tables: {
					databaseType: DatabaseType.POSTGRES,
					postgres: `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}`,
				},
				endpoints: {},
				region: 'eu-central-1',
				awsCreds: { accessKeyId: '', secretAccessKey: '' },
				port: 0,
				domains: { api: '', site: '' },
				eventBusName: '',
				buckets: { files: '' },
				isLocal: true,
				ses: { accessKeyId: '', secretAccessKey: '' },
			};
			const app = App.forRoot({
				modules: [
					{ token: CONFIG_SERVICE, value: config },
					{ token: RelationalDbService, module: RelationalDbService },
				],
			});
			return {
				app,
				ExpenseRepositoryImplementation: ExpenseRelationalRepository,
			};
		},
	},
])('$name (E2E)', ({ setup, name }) => {
	beforeEach(async () => {
		if (name === 'ExpenseDynamodbRepository') {
			await ensureDynamoTableExists();
			await clearDynamoTable({
				tableName: DYNAMODB_TABLE_NAME,
				port: DYNAMODB_PORT,
			});
		}
	});

	it('should create, get, and delete an expense', async () => {
		const { app, ExpenseRepositoryImplementation } = await setup();
		const repo = app.create<ExpenseRepository>(ExpenseRepositoryImplementation);

		const expense = new ExpenseEntity({
			id: 'ex1',
			name: 'Test Expense',
			expendedCents: 1000,
			createdAt: new Date(),
			updatedAt: new Date(),
			expendedAt: new Date(),
		});
		if (name === 'ExpenseDynamodbRepository') {
			await repo.createWithId(expense.id);
		}
		await repo.save(expense);
		const found = await repo.getById('ex1');
		expect(found).toBeDefined();
		expect(found?.name).toBe('Test Expense');
		await repo.delete('ex1');
		const afterDelete = await repo.getById('ex1');
		expect(afterDelete).toBeNull();
	});

	it('should list expenses using listByQuery', async () => {
		const { app, ExpenseRepositoryImplementation } = await setup();
		const repo = app.create<ExpenseRepository>(ExpenseRepositoryImplementation);
		const expenses = [
			new ExpenseEntity({
				id: 'ex2',
				name: 'Lunch',
				expendedCents: 1500,
				createdAt: new Date(),
				updatedAt: new Date(),
				expendedAt: new Date(),
			}),
			new ExpenseEntity({
				id: 'ex3',
				name: 'Taxi',
				expendedCents: 2000,
				createdAt: new Date(),
				updatedAt: new Date(),
				expendedAt: new Date(),
			}),
			new ExpenseEntity({
				id: 'ex4',
				name: 'Hotel',
				expendedCents: 5000,
				createdAt: new Date(),
				updatedAt: new Date(),
				expendedAt: new Date(),
			}),
		];
		for (const e of expenses) {
			if (name === 'ExpenseDynamodbRepository') {
				await repo.createWithId(e.id);
			}
			await repo.save(e);
		}
		const all = await repo.listByQuery({});
		const allIds = all.map((e: ExpenseEntity) => e.id);
		expect(allIds).toEqual(expect.arrayContaining(['ex2', 'ex3', 'ex4']));
		const searchLunch = await repo.listByQuery({ where: { search: 'lunch' } });
		expect(searchLunch.length).toBeGreaterThan(0);
		expect(searchLunch[0].name.toLowerCase()).toContain('lunch');
		const searchNone = await repo.listByQuery({ where: { search: 'xyz' } });
		expect(searchNone.length).toBe(0);
		for (const e of expenses) {
			await repo.delete(e.id);
		}
	});
});

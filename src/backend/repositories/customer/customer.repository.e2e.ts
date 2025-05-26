// @vitest-environment node
// @vitest-execute serial

import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import { CustomerEntity } from '@/backend/entities/customer.entity';
import { DatabaseType } from '@/backend/services/constants';
import { CustomerDynamodbRepository } from './customer.dynamodb-repository';
import { CustomerRelationalRepository } from './customer.relational-repository';
import { DynamoDBService } from '@/backend/services/dynamodb.service';
import { RelationalDbService } from '@/backend/services/relationaldb.service';
import { CustomerOrmEntity } from './relational-orm-entity';
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
import { CustomerRepository } from './interface';
import { clearDynamoTable } from '@/test/clear-dynamo-table';

/**
 * Parameterized test suite for both repository implementations.
 */
describe.each([
	{
		dbType: DatabaseType.DYNAMODB,
		name: 'CustomerDynamodbRepository',
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
				CustomerRepositoryImplementation: CustomerDynamodbRepository,
			};
		},
	},
	{
		dbType: DatabaseType.POSTGRES,
		name: 'CustomerRelationalRepository',
		setup: async () => {
			const { OrmEntityRegistry } = await import(
				'@/common/orm-entity-registry'
			);
			OrmEntityRegistry.push(CustomerOrmEntity);
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
				CustomerRepositoryImplementation: CustomerRelationalRepository,
			};
		},
	},
])('$name (E2E)', ({ setup, name }) => {
	beforeEach(async () => {
		if (name === 'CustomerDynamodbRepository') {
			await ensureDynamoTableExists();
			await clearDynamoTable({
				tableName: DYNAMODB_TABLE_NAME,
				port: DYNAMODB_PORT,
			});
		}
	});

	it('should create, get, and delete a customer', async () => {
		const { app, CustomerRepositoryImplementation } = await setup();
		const repo = app.create<CustomerRepository>(
			CustomerRepositoryImplementation,
		);

		const customer = new CustomerEntity({
			id: 'c1',
			name: 'Test Customer',
			customerNumber: 'CUST-001',
			showContact: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		if (name === 'CustomerDynamodbRepository') {
			await repo.createWithId(customer.id);
		}
		await repo.save(customer);
		const found = await repo.getById('c1');
		expect(found).toBeDefined();
		expect(found?.name).toBe('Test Customer');
		await repo.delete('c1');
		const afterDelete = await repo.getById('c1');
		expect(afterDelete).toBeNull();
	});

	it('should list customers using listByQuery', async () => {
		const { app, CustomerRepositoryImplementation } = await setup();
		const repo = app.create<CustomerRepository>(
			CustomerRepositoryImplementation,
		);
		const customers = [
			new CustomerEntity({
				id: 'c2',
				name: 'Alice',
				customerNumber: 'CUST-002',
				showContact: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			}),
			new CustomerEntity({
				id: 'c3',
				name: 'Bob',
				customerNumber: 'CUST-003',
				showContact: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			}),
			new CustomerEntity({
				id: 'c4',
				name: 'Charlie',
				customerNumber: 'CUST-004',
				showContact: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			}),
		];
		for (const c of customers) {
			if (name === 'CustomerDynamodbRepository') {
				await repo.createWithId(c.id);
			}
			await repo.save(c);
		}
		const all = await repo.listByQuery({});
		const allIds = all.map((c: CustomerEntity) => c.id);
		expect(allIds).toEqual(expect.arrayContaining(['c2', 'c3', 'c4']));
		const searchAlice = await repo.listByQuery({ where: { search: 'ali' } });
		expect(searchAlice.length).toBeGreaterThan(0);
		expect(searchAlice[0].name.toLowerCase()).toContain('alice');
		const searchNone = await repo.listByQuery({ where: { search: 'xyz' } });
		expect(searchNone.length).toBe(0);
		for (const c of customers) {
			await repo.delete(c.id);
		}
	});
});

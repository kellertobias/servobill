// @vitest-environment node
// @vitest-execute serial

import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import { ProductEntity } from '@/backend/entities/product.entity';
import { DatabaseType } from '@/backend/services/constants';
import { ProductDynamodbRepository } from './product.dynamodb-repository';
import { ProductRelationalRepository } from './product.relational-repository';
import { DynamoDBService } from '@/backend/services/dynamodb.service';
import { RelationalDbService } from '@/backend/services/relationaldb.service';
import { ProductOrmEntity } from './relational-orm-entity';
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
import { ProductRepository } from './interface';
import {
	DynamoDBClient,
	ScanCommand,
	DeleteItemCommand,
} from '@aws-sdk/client-dynamodb';

/**
 * Helper to clear all items from the DynamoDB test table.
 * Only used for DynamoDB E2E tests to avoid data collisions.
 */
async function clearDynamoTable() {
	const client = new DynamoDBClient({
		region: 'eu-central-1',
		endpoint: `http://localhost:${DYNAMODB_PORT}`,
		credentials: {
			accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
			secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
		},
	});
	const scan = await client.send(
		new ScanCommand({ TableName: DYNAMODB_TABLE_NAME }),
	);
	if (scan.Items) {
		for (const item of scan.Items) {
			await client.send(
				new DeleteItemCommand({
					TableName: DYNAMODB_TABLE_NAME,
					Key: {
						pk: item.pk,
						sk: item.sk,
					},
				}),
			);
		}
	}
}

/**
 * Parameterized test suite for both repository implementations.
 */
describe.each([
	{
		dbType: DatabaseType.DYNAMODB,
		name: 'ProductDynamodbRepository',
		setup: async () => {
			await ensureDynamoTableExists();
			// Prepare config object matching ConfigService shape
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
			// Register config in DI context
			const app = App.forRoot({
				modules: [
					{ token: CONFIG_SERVICE, value: config },
					{ token: DynamoDBService, module: DynamoDBService },
					DynamoDBService,
				],
			});
			return {
				app,
				ProductRepositoryImplementation: ProductDynamodbRepository,
			};
		},
	},
	{
		dbType: DatabaseType.POSTGRES,
		name: 'ProductRelationalRepository',
		setup: async () => {
			const { OrmEntityRegistry } = await import(
				'@/common/orm-entity-registry'
			);
			OrmEntityRegistry.push(ProductOrmEntity);
			await new Promise((res) => setTimeout(res, 1000));
			// Prepare config object matching ConfigService shape
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
			// Register config in DI context
			const app = App.forRoot({
				modules: [
					{ token: CONFIG_SERVICE, value: config },
					{ token: RelationalDbService, module: RelationalDbService },
				],
			});
			return {
				app,
				ProductRepositoryImplementation: ProductRelationalRepository,
			};
		},
	},
])('$name (E2E)', ({ setup, name }) => {
	/**
	 * Each test creates its own DI context (App instance) for isolation.
	 */
	beforeEach(async () => {
		if (name === 'ProductDynamodbRepository') {
			await ensureDynamoTableExists();
			await clearDynamoTable();
		}
	});

	it('should create, get, and delete a product', async () => {
		const { app, ProductRepositoryImplementation } = await setup();
		// Use app.create to instantiate the repository with DI
		const repo = app.create<ProductRepository>(ProductRepositoryImplementation);

		const product = new ProductEntity({
			id: 'p1',
			name: 'Test Product',
			category: 'cat',
			priceCents: 1000,
			taxPercentage: 20,
			createdAt: new Date(),
			updatedAt: new Date(),
			notes: 'note',
			description: 'desc',
			unit: 'pcs',
			expenseCents: 0,
			expenseMultiplicator: 1,
			expenseCategoryId: '',
		});
		if (name === 'ProductDynamodbRepository') {
			await repo.createWithId(product.id);
		}
		await repo.save(product);
		const found = await repo.getById('p1');
		expect(found).toBeDefined();
		expect(found?.name).toBe('Test Product');
		await repo.delete('p1');
		const afterDelete = await repo.getById('p1');
		expect(afterDelete).toBeNull();
	});

	/**
	 * E2E test for listByQuery method.
	 * - Verifies listing all products
	 * - Verifies searching by name
	 * - Verifies skip/limit (if supported)
	 * - Verifies empty result edge case
	 */
	it('should list products using listByQuery', async () => {
		const { app }: { app: App } = await setup();
		// Use app.create to instantiate the repository with DI
		const repo =
			name === 'ProductDynamodbRepository'
				? (app.create(ProductDynamodbRepository) as ProductDynamodbRepository)
				: (app.create(
						ProductRelationalRepository,
					) as ProductRelationalRepository);
		// Create multiple products
		const products = [
			new ProductEntity({
				id: 'p2',
				name: 'Apple',
				category: 'fruit',
				priceCents: 100,
				taxPercentage: 5,
				createdAt: new Date(),
				updatedAt: new Date(),
				notes: '',
				description: '',
				unit: 'pcs',
				expenseCents: 0,
				expenseMultiplicator: 1,
				expenseCategoryId: '',
			}),
			new ProductEntity({
				id: 'p3',
				name: 'Banana',
				category: 'fruit',
				priceCents: 200,
				taxPercentage: 5,
				createdAt: new Date(),
				updatedAt: new Date(),
				notes: '',
				description: '',
				unit: 'pcs',
				expenseCents: 0,
				expenseMultiplicator: 1,
				expenseCategoryId: '',
			}),
			new ProductEntity({
				id: 'p4',
				name: 'Carrot',
				category: 'vegetable',
				priceCents: 150,
				taxPercentage: 5,
				createdAt: new Date(),
				updatedAt: new Date(),
				notes: '',
				description: '',
				unit: 'pcs',
				expenseCents: 0,
				expenseMultiplicator: 1,
				expenseCategoryId: '',
			}),
		];
		for (const p of products) {
			if (name === 'ProductDynamodbRepository') {
				await repo.createWithId(p.id);
			}
			await repo.save(p);
		}

		// List all products (should include all created)
		const all = await repo.listByQuery({});
		const allIds = all.map((p: ProductEntity) => p.id);
		expect(allIds).toEqual(expect.arrayContaining(['p2', 'p3', 'p4']));

		// Search by name (case-insensitive, partial)
		const searchApple = await repo.listByQuery({ where: { search: 'app' } });
		expect(searchApple.length).toBeGreaterThan(0);
		expect(searchApple[0].name.toLowerCase()).toContain('apple');

		// Test skip/limit (only for relational)
		if (name === 'ProductRelationalRepository') {
			const limited = await repo.listByQuery({ skip: 1, limit: 1 });
			expect(limited.length).toBe(1);
		}

		// Search for non-existent product
		const searchNone = await repo.listByQuery({ where: { search: 'xyz' } });
		expect(searchNone.length).toBe(0);

		// Cleanup
		for (const p of products) {
			await repo.delete(p.id);
		}
	});
});

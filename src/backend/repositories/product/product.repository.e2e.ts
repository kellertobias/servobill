// @vitest-environment node
// @vitest-execute serial

import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';

import { ProductDynamodbRepository } from './product.dynamodb-repository';
import { ProductRelationalRepository } from './product.relational-repository';
import { ProductOrmEntity } from './relational-orm-entity';
import { ProductRepository } from './interface';

import { prepareRepoTest } from '@/test/repo-test';
import { ProductEntity } from '@/backend/entities/product.entity';

/**
 * Helper to clear all items from the DynamoDB test table.
 * Only used for DynamoDB E2E tests to avoid data collisions.
 */

const repoTestCases = prepareRepoTest<ProductRepository>({
	name: 'Product',
	relational: ProductRelationalRepository,
	dynamodb: ProductDynamodbRepository,
	relationalOrmEntity: ProductOrmEntity,
});

describe.each(repoTestCases)('$name (E2E)', ({ setup, onBeforeEach }) => {
	/**
	 * Each test creates its own DI context (App instance) for isolation.
	 */
	beforeEach(async () => {
		await onBeforeEach();
	});

	it('should create, get, and delete a product', async () => {
		const { app, RepositoryImplementation } = await setup();
		// Use app.create to instantiate the repository with DI
		const repo = app.create<ProductRepository>(RepositoryImplementation);

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
			expenses: [
				{ name: 'Catering', price: 200, categoryId: 'cat1' },
				{ name: 'Travel', price: 500, categoryId: 'cat2' },
			],
		});
		await repo.createWithId(product.id);
		await repo.save(product);
		const found = await repo.getById('p1');
		expect(found).toBeDefined();
		expect(found?.name).toBe('Test Product');
		expect(found?.expenses).toBeDefined();
		expect(found?.expenses?.length).toBe(2);
		expect(found?.expenses?.[0].name).toBe('Catering');
		expect(found?.expenses?.[1].name).toBe('Travel');
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
		const { app, RepositoryImplementation } = await setup();
		const repo = app.create<ProductRepository>(RepositoryImplementation);
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
				expenses: [
					{
						name: 'Transport',
						price: 10,
						categoryId: 'cat1',
					},
				],
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
				expenses: [],
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
				expenses: [{ name: 'Storage', price: 5, categoryId: 'cat2' }],
			}),
		];
		for (const p of products) {
			await repo.createWithId(p.id);

			await repo.save(p);
		}

		// List all products (should include all created)
		const all = await repo.listByQuery({});
		const allIds = all.map((p) => p.id);
		expect(allIds).toEqual(expect.arrayContaining(['p2', 'p3', 'p4']));

		// Search by name (case-insensitive, partial)
		const searchApple = await repo.listByQuery({ where: { search: 'app' } });
		expect(searchApple.length).toBeGreaterThan(0);
		expect(searchApple[0].name.toLowerCase()).toContain('apple');

		// Test skip/limit (only for relational)
		// DynamoDB implementation does not support skip/limit, so only test for relational
		if (RepositoryImplementation === ProductRelationalRepository) {
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

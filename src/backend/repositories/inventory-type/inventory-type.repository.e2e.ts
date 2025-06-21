// @vitest-environment node
// @vitest-execute serial

import 'reflect-metadata';
import { randomUUID } from 'crypto';

import { describe, it, expect, beforeEach } from 'vitest';

import { InventoryTypeDynamoDBRepository } from './inventory-type.dynamodb-repository';
import { InventoryTypeRelationalRepository } from './inventory-type.relational-repository';
import { InventoryTypeOrmEntity } from './relational-orm-entity';
import { InventoryTypeRepository } from './interface';

import { InventoryTypeEntity } from '@/backend/entities/inventory-type.entity';
import { prepareRepoTest } from '@/test/repo-test';

/**
 * Parameterized test suite for both repository implementations.
 */
const repoTestCases = prepareRepoTest<InventoryTypeRepository>({
	name: 'InventoryType',
	relational: InventoryTypeRelationalRepository,
	dynamodb: InventoryTypeDynamoDBRepository,
	relationalOrmEntity: InventoryTypeOrmEntity,
});

describe.each(repoTestCases)('$name (E2E)', ({ setup, onBeforeEach }) => {
	beforeEach(async () => {
		await onBeforeEach();
	});

	it('should create, get, and delete an inventory type', async () => {
		const { app, RepositoryImplementation } = await setup();
		const repo = app.create<InventoryTypeRepository>(RepositoryImplementation);

		const id = randomUUID();
		const inventoryType = new InventoryTypeEntity({
			id,
			name: 'Test Type',
			properties: ['color', 'size'],
			checkInterval: 30,
			checkType: 'monthly',
		});
		await repo.createWithId(inventoryType.id);
		await repo.save(inventoryType);

		const retrievedType = await repo.getById(inventoryType.id);
		expect(retrievedType).toBeDefined();
		expect(retrievedType!.id).toBe(inventoryType.id);
		expect(retrievedType!.name).toBe('Test Type');
		expect(retrievedType!.properties).toEqual(['color', 'size']);
		expect(retrievedType!.checkInterval).toBe(30);
		expect(retrievedType!.checkType).toBe('monthly');

		await repo.delete(id);
		const afterDelete = await repo.getById(id);
		expect(afterDelete).toBeNull();
	});

	it('should list inventory types using listByQuery', async () => {
		const { app, RepositoryImplementation } = await setup();
		const repo = app.create<InventoryTypeRepository>(RepositoryImplementation);

		const id1 = randomUUID();
		const id2 = randomUUID();

		const types = [
			new InventoryTypeEntity({
				id: id1,
				name: 'Electronics',
				properties: ['brand', 'model'],
				checkInterval: 90,
				checkType: 'quarterly',
			}),
			new InventoryTypeEntity({
				id: id2,
				name: 'Clothing',
				properties: ['material', 'size'],
				checkInterval: 180,
				checkType: 'semi-annually',
			}),
		];

		for (const type of types) {
			const createdType = await repo.createWithId(type.id);
			createdType.updateName(type.name);
			createdType.updateProperties(type.properties);
			createdType.updateCheckInterval(type.checkInterval!);
			createdType.updateCheckType(type.checkType!);
			await repo.save(createdType);

			const retrievedType = await repo.getById(type.id);
			expect(retrievedType).toBeDefined();
		}

		const allTypes = await repo.listByQuery({});
		const allIds = allTypes.map((t) => t.id);
		expect(allIds).toEqual(expect.arrayContaining([id1, id2]));

		for (const type of types) {
			await repo.delete(type.id);
		}
	});

	it('should support hierarchical structure with parent-child relationships', async () => {
		const { app, RepositoryImplementation } = await setup();
		const repo = app.create<InventoryTypeRepository>(RepositoryImplementation);

		// Create parent type
		const parentId = randomUUID();
		const parentType = new InventoryTypeEntity({
			id: parentId,
			name: 'Electronics',
			properties: ['brand'],
		});
		await repo.createWithId(parentType.id);
		await repo.save(parentType);

		// Create child type
		const childId = randomUUID();
		const childType = new InventoryTypeEntity({
			id: childId,
			name: 'Smartphones',
			properties: ['brand', 'model', 'storage'],
			parent: parentId,
		});
		await repo.createWithId(childType.id);
		await repo.save(childType);

		// Verify parent-child relationship
		const retrievedParent = await repo.getById(parentId);
		const retrievedChild = await repo.getById(childId);

		expect(retrievedParent).toBeDefined();
		expect(retrievedChild).toBeDefined();
		expect(retrievedParent!.isRoot()).toBe(true);
		expect(retrievedChild!.hasParent()).toBe(true);
		expect(retrievedChild!.parent).toBe(parentId);

		// Test root-only query
		const rootTypes = await repo.listByQuery({ where: { rootOnly: true } });
		const rootIds = rootTypes.map((t) => t.id);
		expect(rootIds).toContain(parentId);
		expect(rootIds).not.toContain(childId);

		// Test parent query
		const childTypes = await repo.listByQuery({ where: { parent: parentId } });
		const childIds = childTypes.map((t) => t.id);
		expect(childIds).toContain(childId);

		// Cleanup
		await repo.delete(childId);
		await repo.delete(parentId);
	});

	it('should support search functionality', async () => {
		const { app, RepositoryImplementation } = await setup();
		const repo = app.create<InventoryTypeRepository>(RepositoryImplementation);

		const id1 = randomUUID();
		const id2 = randomUUID();

		const types = [
			new InventoryTypeEntity({
				id: id1,
				name: 'Electronics',
				properties: ['brand'],
			}),
			new InventoryTypeEntity({
				id: id2,
				name: 'Electrical Equipment',
				properties: ['voltage'],
			}),
		];

		for (const type of types) {
			const createdType = await repo.createWithId(type.id);
			createdType.updateName(type.name);
			createdType.updateProperties(type.properties);
			await repo.save(createdType);
		}

		// Search for types containing "Electr"
		const searchResults = await repo.listByQuery({
			where: { search: 'Electr' },
		});
		const searchIds = searchResults.map((t) => t.id);
		expect(searchIds).toEqual(expect.arrayContaining([id1, id2]));

		// Cleanup
		for (const type of types) {
			await repo.delete(type.id);
		}
	});
});

import { randomUUID } from 'crypto';

import { describe, it, beforeAll, afterAll, expect } from 'vitest';

import {
	prepareGraphqlTest,
	type ExecuteTestFunction,
} from '@/test/graphql-test';
import { INVENTORY_ITEM_REPOSITORY } from '@/backend/repositories/inventory-item/di-tokens';
import { INVENTORY_TYPE_REPOSITORY } from '@/backend/repositories/inventory-type/di-tokens';
import { INVENTORY_LOCATION_REPOSITORY } from '@/backend/repositories/inventory-location/di-tokens';
import {
	InventoryItemState,
	InventoryItemEntity,
} from '@/backend/entities/inventory-item.entity';
import { InventoryTypeEntity } from '@/backend/entities/inventory-type.entity';
import { InventoryLocationEntity } from '@/backend/entities/inventory-location.entity';
import type { InventoryItemRepository } from '@/backend/repositories/inventory-item/interface';
import type { InventoryTypeRepository } from '@/backend/repositories/inventory-type/interface';
import type { InventoryLocationRepository } from '@/backend/repositories/inventory-location/interface';
import { App } from '@/common/di';

/**
 * Integration tests for InventoryResolver.
 *
 * This suite covers all queries and mutations, and verifies DB state after mutations.
 * It uses the dependency-injected GraphQL test app and repositories for assertions.
 */
describe('InventoryResolver (integration)', () => {
	let execute: ExecuteTestFunction;
	let app: App;
	let itemRepo: InventoryItemRepository;
	let typeRepo: InventoryTypeRepository;
	let locationRepo: InventoryLocationRepository;
	let typeId: string;
	let locationId: string;

	beforeAll(async () => {
		// Prepare DI GraphQL app and get repositories
		const testEnv = await prepareGraphqlTest();
		execute = testEnv.execute;
		app = testEnv.app;
		itemRepo = app.get(INVENTORY_ITEM_REPOSITORY);
		typeRepo = app.get(INVENTORY_TYPE_REPOSITORY);
		locationRepo = app.get(INVENTORY_LOCATION_REPOSITORY);

		// Seed required inventory type and location using entity constructors
		typeId = randomUUID();
		locationId = randomUUID();
		await typeRepo.save(
			new InventoryTypeEntity({
				id: typeId,
				name: 'TestType',
				checkInterval: 30,
				checkType: 'DAYS',
				properties: [],
				createdAt: new Date(),
				updatedAt: new Date(),
			}),
		);
		await locationRepo.save(
			new InventoryLocationEntity({
				id: locationId,
				name: 'TestLocation',
				createdAt: new Date(),
				updatedAt: new Date(),
			}),
		);
	});

	afterAll(async () => {
		// Clean up test data: delete seeded type and location
		await typeRepo.delete(typeId);
		await locationRepo.delete(locationId);
		// No need to close the app: App does not have a close() method.
	});

	/**
	 * Test the createInventoryItem mutation and verify DB state.
	 */
	it('should create an inventory item', async () => {
		const mutation = `
      mutation CreateItem($input: InventoryItemInput!) {
        createInventoryItem(input: $input) {
          id
          name
          barcode
          state
          type { id name }
          location { id name }
        }
      }
    `;
		const input = {
			name: 'TestItem',
			barcode: 'ABC123',
			typeId,
			locationId,
			state: InventoryItemState.NEW,
			properties: [{ key: 'color', value: 'red' }],
		};
		const res = await execute({ source: mutation, variableValues: { input } });
		expect(!res.errors || res.errors.length === 0).toBe(true);
		const item = res.data.createInventoryItem;
		expect(item.name).toBe('TestItem');
		expect(item.barcode).toBe('ABC123');
		expect(item.type.id).toBe(typeId);
		expect(item.location.id).toBe(locationId);
		// Check DB
		const dbItem = await itemRepo.getById(item.id);
		expect(dbItem).toBeTruthy();
		expect(dbItem?.name).toBe('TestItem');
	});

	/**
	 * Test the inventoryItem query by id.
	 */
	it('should fetch an inventory item by id', async () => {
		// Seed an item using entity constructor
		const seeded = new InventoryItemEntity({
			id: randomUUID(),
			name: 'FetchMe',
			barcode: 'FETCH1',
			typeId,
			locationId,
			state: InventoryItemState.NEW,
			properties: [],
			nextCheck: new Date(),
			lastScanned: new Date(),
			history: [],
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		await itemRepo.save(seeded);
		const query = `
      query GetItem($id: String) {
        inventoryItem(id: $id) {
          id
          name
          barcode
        }
      }
    `;
		const res = await execute({
			source: query,
			variableValues: { id: seeded.id },
		});
		expect(!res.errors || res.errors.length === 0).toBe(true);
		expect(res.data.inventoryItem).toMatchObject({
			id: seeded.id,
			name: 'FetchMe',
			barcode: 'FETCH1',
		});
	});

	/**
	 * Test the inventoryItems query with filtering.
	 * Uses the 'search' field, as InventoryItemWhereInput does not support filtering by 'name' directly.
	 */
	it('should list inventory items with filter', async () => {
		// Seed an item using entity constructor
		const filterMe = new InventoryItemEntity({
			id: randomUUID(),
			name: 'FilterMe',
			barcode: 'FILTER1',
			typeId,
			locationId,
			state: InventoryItemState.NEW,
			properties: [],
			nextCheck: new Date(),
			lastScanned: new Date(),
			history: [],
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		await itemRepo.save(filterMe);
		const query = `
      query ListItems($where: InventoryItemWhereInput) {
        inventoryItems(where: $where) {
          id
          name
        }
      }
    `;
		const res = await execute({
			source: query,
			// Use 'search' instead of 'name' for filtering by text
			variableValues: { where: { search: 'FilterMe' } },
		});
		expect(!res.errors || res.errors.length === 0).toBe(true);
		expect(
			res.data.inventoryItems.some(
				(i: { name: string }) => i.name === 'FilterMe',
			),
		).toBe(true);
	});

	/**
	 * Test the updateInventoryItem mutation and verify DB state.
	 */
	it('should update an inventory item', async () => {
		// Seed an item using entity constructor
		const item = new InventoryItemEntity({
			id: randomUUID(),
			name: 'UpdateMe',
			barcode: 'UPD1',
			typeId,
			locationId,
			state: InventoryItemState.NEW,
			properties: [],
			nextCheck: new Date(),
			lastScanned: new Date(),
			history: [],
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		await itemRepo.save(item);
		const mutation = `
      mutation UpdateItem($id: String!, $input: InventoryItemInput!) {
        updateInventoryItem(id: $id, input: $input) {
          id
          name
          barcode
        }
      }
    `;
		const res = await execute({
			source: mutation,
			variableValues: {
				id: item.id,
				input: { name: 'Updated', barcode: 'UPD2' },
			},
		});
		expect(!res.errors || res.errors.length === 0).toBe(true);
		expect(res.data.updateInventoryItem.name).toBe('Updated');
		// Check DB
		const dbItem = await itemRepo.getById(item.id);
		expect(dbItem?.name).toBe('Updated');
		expect(dbItem?.barcode).toBe('UPD2');
	});

	/**
	 * Test addInventoryCheck and addInventoryNote mutations in a single execution (race condition check).
	 */
	it('should add a check and a note in a single execution', async () => {
		// Seed an item using entity constructor
		const item = new InventoryItemEntity({
			id: randomUUID(),
			name: 'CheckNote',
			barcode: 'CHKNOTE',
			typeId,
			locationId,
			state: InventoryItemState.NEW,
			properties: [],
			nextCheck: new Date(),
			lastScanned: new Date(),
			history: [],
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		await itemRepo.save(item);
		const mutation = `
      mutation AddCheckAndNote($id: String!, $state: InventoryCheckState!, $note: String!) {
        addInventoryCheck(id: $id, state: $state, note: $note)
        addInventoryNote(id: $id, note: $note)
      }
    `;
		const note = 'Checked and noted';
		const res = await execute({
			source: mutation,
			variableValues: { id: item.id, state: 'PASS', note },
		});
		expect(!res.errors || res.errors.length === 0).toBe(true);
		expect(res.data.addInventoryCheck).toBe(true);
		expect(res.data.addInventoryNote).toBe(true);
		// Check DB
		const dbItem = await itemRepo.getById(item.id);
		expect(
			dbItem?.history.some((h: { note?: string }) => h.note === note),
		).toBe(true);
	});

	/**
	 * Test the deleteInventoryItem mutation and verify DB state.
	 */
	it('should delete an inventory item', async () => {
		// Seed an item using entity constructor
		const item = new InventoryItemEntity({
			id: randomUUID(),
			name: 'DeleteMe',
			barcode: 'DEL1',
			typeId,
			locationId,
			state: InventoryItemState.NEW,
			properties: [],
			nextCheck: new Date(),
			lastScanned: new Date(),
			history: [],
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		await itemRepo.save(item);
		const mutation = `
      mutation DeleteItem($id: String!) {
        deleteInventoryItem(id: $id)
      }
    `;
		const res = await execute({
			source: mutation,
			variableValues: { id: item.id },
		});
		expect(!res.errors || res.errors.length === 0).toBe(true);
		expect(res.data.deleteInventoryItem).toBe(true);
		// Check DB
		const dbItem = await itemRepo.getById(item.id);
		expect(dbItem).toBeFalsy();
	});
});

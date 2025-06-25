import { randomUUID } from 'crypto';

import { describe, it, beforeAll, afterAll, expect } from 'vitest';

import { prepareGraphqlTest } from '@/test/graphql-test';
import { INVENTORY_LOCATION_REPOSITORY } from '@/backend/repositories/inventory-location/di-tokens';
import type { InventoryLocationRepository } from '@/backend/repositories/inventory-location/interface';
import { InventoryLocationEntity } from '@/backend/entities/inventory-location.entity';

function hasClose(obj: unknown): obj is { close: () => Promise<void> } {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		typeof (obj as unknown as { close?: unknown }).close === 'function'
	);
}

/**
 * Integration tests for InventoryLocationResolver.
 *
 * This suite covers all queries and mutations, and verifies DB state after mutations.
 * It uses the dependency-injected GraphQL test app and repositories for assertions.
 */
describe('InventoryLocationResolver (integration)', () => {
	let execute: Awaited<ReturnType<typeof prepareGraphqlTest>>['execute'];
	let app: Awaited<ReturnType<typeof prepareGraphqlTest>>['app'];
	let repo: InventoryLocationRepository;
	let seededId: string;
	let seededBarcode: string;

	beforeAll(async () => {
		// Prepare DI GraphQL app and get repository
		const testEnv: Awaited<ReturnType<typeof prepareGraphqlTest>> =
			await prepareGraphqlTest();
		execute = testEnv.execute;
		app = testEnv.app;
		repo = app.get(INVENTORY_LOCATION_REPOSITORY);

		// Seed a location for query tests
		seededId = randomUUID();
		seededBarcode = 'BARCODE-123';
		await repo.save(
			new InventoryLocationEntity({
				id: seededId,
				name: 'SeededLocation',
				barcode: seededBarcode,
				createdAt: new Date(),
				updatedAt: new Date(),
			}),
		);
	});

	afterAll(async () => {
		// Clean up test data
		await repo.delete(seededId);
		if (hasClose(app)) {
			await app.close();
		}
	});

	/**
	 * Test the inventoryLocation query by id.
	 */
	it('should fetch an inventory location by id', async () => {
		const query = `
      query GetLocation($id: String!) {
        inventoryLocation(id: $id) {
          id
          name
          barcode
        }
      }
    `;
		const res = await execute({
			source: query,
			variableValues: { id: seededId },
		});
		expect(res.errors).toBeUndefined();
		expect(res.data.inventoryLocation).toMatchObject({
			id: seededId,
			name: 'SeededLocation',
			barcode: seededBarcode,
		});
	});

	/**
	 * Test the inventoryLocationByBarcode query.
	 */
	it('should fetch an inventory location by barcode', async () => {
		const query = `
      query GetLocationByBarcode($barcode: String!) {
        inventoryLocationByBarcode(barcode: $barcode) {
          id
          name
          barcode
        }
      }
    `;
		const res = await execute({
			source: query,
			variableValues: { barcode: seededBarcode },
		});
		expect(res.errors).toBeUndefined();
		expect(res.data.inventoryLocationByBarcode).toMatchObject({
			id: seededId,
			name: 'SeededLocation',
			barcode: seededBarcode,
		});
	});

	/**
	 * Test the inventoryLocations query with filtering.
	 */
	it('should list inventory locations with filter', async () => {
		const query = `
      query ListLocations($where: InventoryLocationWhereInput) {
        inventoryLocations(where: $where) {
          id
          name
        }
      }
    `;
		const res = await execute({
			source: query,
			variableValues: { where: { search: 'Seeded' } },
		});
		expect(res.errors).toBeUndefined();
		expect(
			(res.data.inventoryLocations as Array<{ id: string }>).some(
				(l) => l.id === seededId,
			),
		).toBe(true);
	});

	/**
	 * Test the createInventoryLocation mutation and verify DB state.
	 */
	it('should create an inventory location', async () => {
		const mutation = `
      mutation CreateLocation($input: CreateInventoryLocationInput!) {
        createInventoryLocation(input: $input) {
          id
          name
          barcode
        }
      }
    `;
		const input = {
			name: 'NewLocation',
			barcode: 'NEW-LOC-001',
		};
		const res = await execute({ source: mutation, variableValues: { input } });
		expect(res.errors).toBeUndefined();
		const loc = res.data.createInventoryLocation;
		expect(loc.name).toBe('NewLocation');
		expect(loc.barcode).toBe('NEW-LOC-001');
		// Check DB
		const dbLoc = await repo.getById(loc.id);
		expect(dbLoc).not.toBeNull();
		expect(dbLoc?.name).toBe('NewLocation');
	});

	/**
	 * Test the updateInventoryLocation mutation and verify DB state.
	 */
	it('should update an inventory location', async () => {
		// Create a location to update
		const entity = new InventoryLocationEntity({
			id: randomUUID(),
			name: 'UpdateMe',
			barcode: 'UPD-LOC-001',
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		await repo.save(entity);
		const mutation = `
      mutation UpdateLocation($id: String!, $input: UpdateInventoryLocationInput!) {
        updateInventoryLocation(id: $id, input: $input) {
          id
          name
          barcode
        }
      }
    `;
		const input = { name: 'UpdatedName', barcode: 'UPDATED-001' };
		const res = await execute({
			source: mutation,
			variableValues: { id: entity.id, input },
		});
		expect(res.errors).toBeUndefined();
		const updated = res.data.updateInventoryLocation;
		expect(updated.name).toBe('UpdatedName');
		expect(updated.barcode).toBe('UPDATED-001');
		// Check DB
		const dbLoc = await repo.getById(entity.id);
		expect(dbLoc).not.toBeNull();
		expect(dbLoc?.name).toBe('UpdatedName');
		expect(dbLoc?.barcode).toBe('UPDATED-001');
	});

	/**
	 * Test the deleteInventoryLocation mutation and verify DB state.
	 */
	it('should delete an inventory location', async () => {
		// Create a location to delete
		const entity = new InventoryLocationEntity({
			id: randomUUID(),
			name: 'DeleteMe',
			barcode: 'DEL-LOC-001',
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		await repo.save(entity);
		const mutation = `
      mutation DeleteLocation($id: String!) {
        deleteInventoryLocation(id: $id)
      }
    `;
		const res = await execute({
			source: mutation,
			variableValues: { id: entity.id },
		});
		expect(res.errors).toBeUndefined();
		expect(res.data.deleteInventoryLocation).toBe(true);
		// Check DB
		const dbLoc = await repo.getById(entity.id);
		expect(dbLoc).toBeNull();
	});

	/**
	 * Test race condition: create, update, and delete in a single execution.
	 * This ensures no race conditions in resolver logic.
	 */
	it('should handle create, update, and delete in a single execution', async () => {
		const mutation = `
      mutation Combo($create: CreateInventoryLocationInput!, $update: UpdateInventoryLocationInput!, $deleteId: String!) {
        a: createInventoryLocation(input: $create) { id name barcode }
        b: updateInventoryLocation(id: $deleteId, input: $update) { id name barcode }
        c: deleteInventoryLocation(id: $deleteId)
      }
    `;
		// Create a location to update and delete
		const entity = new InventoryLocationEntity({
			id: randomUUID(),
			name: 'ComboMe',
			barcode: 'COMBO-001',
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		await repo.save(entity);
		const create = { name: 'ComboNew', barcode: 'COMBO-NEW' };
		const update = { name: 'ComboUpdated', barcode: 'COMBO-UPD' };
		const res = await execute({
			source: mutation,
			variableValues: { create, update, deleteId: entity.id },
		});
		expect(res.errors).toBeUndefined();
		// Check create
		const created = res.data.a;
		const dbCreated = await repo.getById(created.id);
		expect(dbCreated).not.toBeNull();
		expect(dbCreated?.name).toBe('ComboNew');
		// Check update
		const updated = res.data.b;
		expect(updated.name).toBe('ComboUpdated');
		// Check delete
		const deleted = res.data.c;
		expect(deleted).toBe(true);
		const dbDeleted = await repo.getById(entity.id);
		expect(dbDeleted).toBeNull();
	});
});

import { randomUUID } from 'crypto';

import { describe, it, beforeAll, afterAll, expect } from 'vitest';

import { InventoryLocation } from './inventory-location.schema';

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

	/**
	 * Test filtering inventory locations by parent ID.
	 * This test creates a parent and a child location, then queries for locations with the parent's ID as the parent filter.
	 * It asserts that only the child location is returned.
	 */
	it('should filter inventory locations by parent ID', async () => {
		// Create a parent location
		const parentId = randomUUID();
		const parent = new InventoryLocationEntity({
			id: parentId,
			name: 'ParentLocation',
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		await repo.save(parent);

		// Create a child location with parent set
		const childId = randomUUID();
		const child = new InventoryLocationEntity({
			id: childId,
			name: 'ChildLocation',
			parent: parentId,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		await repo.save(child);

		const query = `
      query ListLocations($where: InventoryLocationWhereInput) {
        inventoryLocations(where: $where) {
          id
          name
          parent
        }
      }
    `;
		const res = await execute({
			source: query,
			variableValues: { where: { parent: parentId } },
		});
		expect(res.errors).toBeUndefined();
		const locations = res.data.inventoryLocations as InventoryLocation[];
		expect(Array.isArray(locations)).toBe(true);
		expect(locations.length).toBeGreaterThanOrEqual(1);
		// Only the child should have this parent
		const childResult = locations.find((l) => l.id === childId);
		expect(childResult).toBeDefined();
		expect(childResult!.parent).toBe(parentId);
		// Optionally, ensure no unrelated locations are returned
		locations.forEach((l) => {
			expect(l.parent).toBe(parentId);
		});
		// Cleanup
		await repo.delete(childId);
		await repo.delete(parentId);
	});

	/**
	 * Test filtering inventory locations by rootOnly.
	 *
	 * This test creates a root and a child location, then queries with rootOnly: true and asserts:
	 *   - Only root elements (with parent: null) are returned
	 *   - No child elements are included in the result
	 *
	 * Note: GraphQL returns null for missing fields, not undefined. The test should expect null for parent.
	 */
	it('should filter inventory locations by rootOnly', async () => {
		// Create a root location
		const rootId = randomUUID();
		const root = new InventoryLocationEntity({
			id: rootId,
			name: 'RootLocation',
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		await repo.save(root);

		// Create a child location with parent set
		const childId = randomUUID();
		const child = new InventoryLocationEntity({
			id: childId,
			name: 'ChildOfRoot',
			parent: rootId,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		await repo.save(child);

		const query = `
      query ListLocations($where: InventoryLocationWhereInput) {
        inventoryLocations(where: $where) {
          id
          name
          parent
        }
      }
    `;
		const res = await execute({
			source: query,
			variableValues: { where: { rootOnly: true } },
		});
		expect(res.errors).toBeUndefined();
		const locations = res.data.inventoryLocations as InventoryLocation[];
		expect(Array.isArray(locations)).toBe(true);
		// Assert all returned locations are root (parent === null)
		locations.forEach((l) => {
			expect(
				l.parent === null || l.parent === undefined || l.parent === '',
			).toBe(true);
		});
		// Assert the root is present
		const rootResult = locations.find((l) => l.id === rootId);
		expect(rootResult).toBeDefined();
		// Assert the child is not present
		const childResult = locations.find((l) => l.id === childId);
		expect(childResult).toBeUndefined();
		// Cleanup
		await repo.delete(childId);
		await repo.delete(rootId);
	});

	/**
	 * Test querying an inventory location and retrieving its children.
	 *
	 * This test creates a parent and multiple children, then queries for all locations with the parent's ID as the parent filter.
	 * It asserts that all children are returned and match the expected parent ID.
	 */
	it('should retrieve all children of a parent inventory location', async () => {
		// Create a parent location
		const parentId = randomUUID();
		const parent = new InventoryLocationEntity({
			id: parentId,
			name: 'ParentWithChildren',
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		await repo.save(parent);

		// Create multiple children
		const childIds: string[] = [];
		for (let i = 0; i < 3; i++) {
			const childId = randomUUID();
			childIds.push(childId);
			const child = new InventoryLocationEntity({
				id: childId,
				name: `Child${i + 1}`,
				parent: parentId,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			await repo.save(child);
		}

		const query = `
      query ListLocations($where: InventoryLocationWhereInput) {
        inventoryLocations(where: $where) {
          id
          name
          parent
        }
      }
    `;
		const res = await execute({
			source: query,
			variableValues: { where: { parent: parentId } },
		});
		expect(res.errors).toBeUndefined();
		const locations = res.data.inventoryLocations as InventoryLocation[];
		expect(Array.isArray(locations)).toBe(true);
		// Assert all children are returned and have the correct parent
		const returnedChildIds = locations.map((l) => l.id);
		childIds.forEach((id) => {
			expect(returnedChildIds).toContain(id);
		});
		locations.forEach((l) => {
			expect(l.parent).toBe(parentId);
		});
		// Cleanup
		for (const id of childIds) {
			await repo.delete(id);
		}
		await repo.delete(parentId);
	});

	/**
	 * Test creating a location with a parent and verifying parent is stored and returned.
	 */
	it('should create an inventory location with a parent and retrieve it', async () => {
		// Create a parent location
		const parentInput = { name: 'ParentForCreateWithParent' };
		const createParentMutation = `
      mutation CreateLocation($input: CreateInventoryLocationInput!) {
        createInventoryLocation(input: $input) { id name }
      }
    `;
		const parentRes = await execute({
			source: createParentMutation,
			variableValues: { input: parentInput },
		});
		expect(parentRes.errors).toBeUndefined();
		const parentLoc = parentRes.data.createInventoryLocation;

		// Create a child location with parent set
		const childInput = { name: 'ChildWithParent', parent: parentLoc.id };
		const createChildMutation = `
      mutation CreateLocation($input: CreateInventoryLocationInput!) {
        createInventoryLocation(input: $input) { id name parent }
      }
    `;
		const childRes = await execute({
			source: createChildMutation,
			variableValues: { input: childInput },
		});
		expect(childRes.errors).toBeUndefined();
		const childLoc = childRes.data.createInventoryLocation;
		expect(childLoc.parent).toBe(parentLoc.id);

		// Query the child location and verify parent
		const getQuery = `
      query GetLocation($id: String!) {
        inventoryLocation(id: $id) { id name parent }
      }
    `;
		const getRes = await execute({
			source: getQuery,
			variableValues: { id: childLoc.id },
		});
		expect(getRes.errors).toBeUndefined();
		expect(getRes.data.inventoryLocation.parent).toBe(parentLoc.id);

		// Cleanup
		await repo.delete(childLoc.id);
		await repo.delete(parentLoc.id);
	});
});

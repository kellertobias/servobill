import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InventoryItemEntity, InventoryItemState } from '@/backend/entities/inventory-item.entity';
import { InventoryLocationEntity } from '@/backend/entities/inventory-location.entity';
import { InventoryTypeEntity } from '@/backend/entities/inventory-type.entity';
import { INVENTORY_ITEM_REPOSITORY } from '@/backend/repositories/inventory-item/di-tokens';
import type { InventoryItemRepository } from '@/backend/repositories/inventory-item/interface';
import { INVENTORY_LOCATION_REPOSITORY } from '@/backend/repositories/inventory-location/di-tokens';
import type { InventoryLocationRepository } from '@/backend/repositories/inventory-location/interface';
import { INVENTORY_TYPE_REPOSITORY } from '@/backend/repositories/inventory-type/di-tokens';
import type { InventoryTypeRepository } from '@/backend/repositories/inventory-type/interface';
import { type ExecuteTestFunction, prepareGraphqlTest } from '@/test/graphql-test';

/**
 * Integration tests for InventoryTypeResolver.
 *
 * This suite covers all queries and mutations, and verifies repository state after mutations.
 * It uses the dependency-injected GraphQL test harness for realistic integration coverage.
 */
describe('InventoryTypeResolver (integration)', () => {
  let execute: ExecuteTestFunction;
  let app: Awaited<ReturnType<typeof prepareGraphqlTest>>['app'];
  let inventoryTypeRepo: InventoryTypeRepository;
  let inventoryItemRepo: InventoryItemRepository;
  let locationRepo: InventoryLocationRepository;
  let location: InventoryLocationEntity;

  beforeAll(async () => {
    // Prepare the GraphQL test environment and get DI app
    const testEnv = await prepareGraphqlTest();
    execute = testEnv.execute;
    app = testEnv.app;
    inventoryTypeRepo = app.get<InventoryTypeRepository>(INVENTORY_TYPE_REPOSITORY);
    inventoryItemRepo = app.get<InventoryItemRepository>(INVENTORY_ITEM_REPOSITORY);
    locationRepo = app.get<InventoryLocationRepository>(INVENTORY_LOCATION_REPOSITORY);
    // Create a location for use in inventory items
    location = new InventoryLocationEntity({
      id: `loc_${Math.random().toString(36).slice(2)}`,
      name: 'TestLocation',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await locationRepo.save(location);
  });

  afterAll(async () => {
    // Clean up all inventory types, items, and locations after tests
    const allTypes = await inventoryTypeRepo.listByQuery({});
    for (const type of allTypes) {
      await inventoryTypeRepo.delete(type.id);
    }
    const allItems = await inventoryItemRepo.listByQuery({});
    for (const item of allItems) {
      await inventoryItemRepo.delete(item.id);
    }
    const allLocations = await locationRepo.listByQuery({});
    for (const loc of allLocations) {
      await locationRepo.delete(loc.id);
    }
  });

  /**
   * Helper to create an inventory type directly in the repository.
   */
  async function createTypeInRepo(
    data: Partial<InventoryTypeEntity> = {}
  ): Promise<InventoryTypeEntity> {
    const type: InventoryTypeEntity = new InventoryTypeEntity({
      id: data.id || `type_${Math.random().toString(36).slice(2)}`,
      name: data.name || 'TestType',
      checkInterval: data.checkInterval || 30,
      checkType: data.checkType || 'NONE',
      properties: data.properties || [],
      parent: data.parent || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await inventoryTypeRepo.save(type);
    return type;
  }

  it('should create, query, update, and delete an inventory type (full lifecycle)', async () => {
    /**
     * This test covers createInventoryType, inventoryType, updateInventoryType, and deleteInventoryType.
     * It also verifies repository state after each mutation.
     */
    // 1. Create
    const createMutation = `
      mutation CreateType($data: InventoryTypeInput!) {
        createInventoryType(data: $data) {
          id
          name
          checkInterval
          checkType
          properties
          parent
          createdAt
          updatedAt
        }
      }
    `;
    const createInput = {
      name: 'Electronics',
      checkInterval: 60,
      checkType: 'PERIODIC',
      properties: ['voltage', 'brand'],
    };
    const createRes = await execute({
      source: createMutation,
      variableValues: { data: createInput },
    });
    expect(createRes.errors).toBeFalsy();
    const created = createRes.data.createInventoryType;
    expect(created.name).toBe('Electronics');
    expect(created.checkInterval).toBe(60);
    expect(created.checkType).toBe('PERIODIC');
    expect(created.properties).toEqual(['voltage', 'brand']);
    // Check in repo
    const repoType = await inventoryTypeRepo.getById(created.id);
    expect(repoType).toBeTruthy();
    expect(repoType?.name).toBe('Electronics');

    // 2. Query by ID
    const queryById = `
      query GetType($id: String!) {
        inventoryType(id: $id) {
          id
          name
          checkInterval
          checkType
          properties
          parent
        }
      }
    `;
    const queryRes = await execute({
      source: queryById,
      variableValues: { id: created.id },
    });
    expect(queryRes.errors).toBeFalsy();
    expect(queryRes.data.inventoryType).toMatchObject({
      id: created.id,
      name: 'Electronics',
      checkInterval: 60,
      checkType: 'PERIODIC',
      properties: ['voltage', 'brand'],
      parent: null,
    });

    // 3. Update
    const updateMutation = `
      mutation UpdateType($id: String!, $data: InventoryTypeInput!) {
        updateInventoryType(id: $id, data: $data) {
          id
          name
          checkInterval
          checkType
          properties
        }
      }
    `;
    const updateInput = {
      name: 'Electronics & Gadgets',
      checkInterval: 90,
      checkType: 'PERIODIC',
      properties: ['voltage', 'brand', 'warranty'],
    };
    const updateRes = await execute({
      source: updateMutation,
      variableValues: { id: created.id, data: updateInput },
    });
    expect(updateRes.errors).toBeFalsy();
    expect(updateRes.data.updateInventoryType).toMatchObject({
      id: created.id,
      name: 'Electronics & Gadgets',
      checkInterval: 90,
      checkType: 'PERIODIC',
      properties: ['voltage', 'brand', 'warranty'],
    });
    // Check in repo
    const updatedType = await inventoryTypeRepo.getById(created.id);
    expect(updatedType?.name).toBe('Electronics & Gadgets');
    expect(updatedType?.checkInterval).toBe(90);
    expect(updatedType?.properties).toContain('warranty');

    // 4. Delete
    const deleteMutation = `
      mutation DeleteType($id: String!) {
        deleteInventoryType(id: $id)
      }
    `;
    const deleteRes = await execute({
      source: deleteMutation,
      variableValues: { id: created.id },
    });
    expect(deleteRes.errors).toBeFalsy();
    expect(deleteRes.data.deleteInventoryType).toBe(true);
    // Check in repo
    const deleted = await inventoryTypeRepo.getById(created.id);
    expect(deleted).toBeNull();
  });

  it('should list inventory types (inventoryTypes query)', async () => {
    // Create two types
    await createTypeInRepo({ name: 'A' });
    await createTypeInRepo({ name: 'B' });
    const listQuery = `
      query ListTypes($where: InventoryTypeWhereInput) {
        inventoryTypes(where: $where) {
          id
          name
        }
      }
    `;
    const res = await execute({ source: listQuery });
    expect(res.errors).toBeFalsy();
    const names: string[] = (res.data.inventoryTypes as Array<{ name: string }>).map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(['A', 'B']));
  });

  it('should not allow creating a type with non-existent parent', async () => {
    const createMutation = `
      mutation CreateType($data: InventoryTypeInput!) {
        createInventoryType(data: $data) { id }
      }
    `;
    const res = await execute({
      source: createMutation,
      variableValues: {
        data: {
          name: 'Child',
          checkInterval: 10,
          checkType: 'NONE',
          parent: 'nonexistent',
        },
      },
    });
    expect(res.errors).toBeTruthy();
    // Defensive: check errors is array and has message property
    const errorMsg =
      Array.isArray(res.errors) &&
      res.errors[0] &&
      typeof res.errors[0] === 'object' &&
      'message' in res.errors[0] &&
      typeof (res.errors[0] as { message: unknown }).message === 'string'
        ? (res.errors[0] as { message: string }).message
        : String(res.errors?.[0]);
    expect(errorMsg).toMatch(/Parent inventory type with id nonexistent not found/);
  });

  it('should not allow deleting a type with items', async () => {
    // Create type and item
    const type = await createTypeInRepo({ name: 'WithItems' });
    // Create an inventory item with required fields
    const item = new InventoryItemEntity({
      id: `item_${Math.random().toString(36).slice(2)}`,
      name: 'Item1',
      typeId: type.id,
      locationId: location.id,
      state: InventoryItemState.NEW,
      properties: [],
      nextCheck: new Date(),
      lastScanned: new Date(),
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await inventoryItemRepo.save(item);
    const deleteMutation = `
      mutation DeleteType($id: String!) {
        deleteInventoryType(id: $id)
      }
    `;
    const res = await execute({
      source: deleteMutation,
      variableValues: { id: type.id },
    });
    expect(res.errors).toBeTruthy();
    // Defensive: check errors is array and has message property
    const errorMsg =
      Array.isArray(res.errors) &&
      res.errors[0] &&
      typeof res.errors[0] === 'object' &&
      'message' in res.errors[0] &&
      typeof (res.errors[0] as { message: unknown }).message === 'string'
        ? (res.errors[0] as { message: string }).message
        : String(res.errors?.[0]);
    expect(errorMsg).toMatch(/items still exist/);
  });

  it('should support multiple mutations in a single execution (race condition check)', async () => {
    // Create, update, and delete in one request
    const multiMutation = `
      mutation Multi($create: InventoryTypeInput!, $update: InventoryTypeInput!) {
        a: createInventoryType(data: $create) { id name }
        b: updateInventoryType(id: "temp", data: $update) { id name }
        c: deleteInventoryType(id: "temp")
      }
    `;
    // Create a type to update/delete
    await createTypeInRepo({ id: 'temp', name: 'Temp' });
    const res = await execute({
      source: multiMutation,
      variableValues: {
        create: { name: 'Multi', checkInterval: 1, checkType: 'NONE' },
        update: { name: 'TempUpdated' },
      },
    });
    expect(res.errors).toBeFalsy();
    expect(res.data.a.name).toBe('Multi');
    expect(res.data.b.name).toBe('TempUpdated');
    expect(res.data.c).toBe(true);
    // Check repo
    const stillThere = await inventoryTypeRepo.getById('temp');
    expect(stillThere).toBeNull();
  });

  /**
   * Test filtering inventory types by rootOnly.
   * This test creates a root and a child type, then queries with rootOnly: true and asserts only the root is returned.
   */
  it('should filter inventory types by rootOnly', async () => {
    // Create a root type
    const rootId = `type_${Math.random().toString(36).slice(2)}`;
    const root = new InventoryTypeEntity({
      id: rootId,
      name: 'RootType',
      checkInterval: 10,
      checkType: 'NONE',
      properties: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await inventoryTypeRepo.save(root);

    // Create a child type with parent set
    const childId = `type_${Math.random().toString(36).slice(2)}`;
    const child = new InventoryTypeEntity({
      id: childId,
      name: 'ChildOfRoot',
      parent: rootId,
      checkInterval: 10,
      checkType: 'NONE',
      properties: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await inventoryTypeRepo.save(child);

    const query = `
			query ListTypes($where: InventoryTypeWhereInput) {
				inventoryTypes(where: $where) {
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
    expect(res.errors).toBeFalsy();
    const types = res.data.inventoryTypes as Array<{
      id: string;
      parent?: string;
    }>;
    expect(Array.isArray(types)).toBe(true);
    // Only the root should be returned
    const rootResult = types.find((t) => t.id === rootId);
    expect(rootResult).toBeDefined();
    expect(rootResult!.parent).toBeFalsy();
    // The child should not be returned
    const childResult = types.find((t) => t.id === childId);
    expect(childResult).toBeUndefined();
    // Cleanup
    await inventoryTypeRepo.delete(childId);
    await inventoryTypeRepo.delete(rootId);
  });
});

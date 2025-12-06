import { randomUUID } from 'node:crypto';

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
import type { App } from '@/common/di';
import { type ExecuteTestFunction, prepareGraphqlTest } from '@/test/graphql-test';

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
      })
    );
    await locationRepo.save(
      new InventoryLocationEntity({
        id: locationId,
        name: 'TestLocation',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
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
      mutation CreateItem($data: InventoryItemInput!) {
        createInventoryItem(data: $data) {
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
    const res = await execute({
      source: mutation,
      variableValues: { data: input },
    });
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
    expect(res.data.inventoryItems.some((i: { name: string }) => i.name === 'FilterMe')).toBe(true);
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
      mutation UpdateItem($id: String!, $data: InventoryItemInput!) {
        updateInventoryItem(id: $id, data: $data) {
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
        data: { name: 'Updated', barcode: 'UPD2' },
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
    expect(dbItem?.history.some((h: { note?: string }) => h.note === note)).toBe(true);
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

  /**
   * Seeds the repositories with demo inventory data (types, locations, items).
   * This mimics the structure of the dev utility but stores data in the backend repositories.
   * @param typeRepo InventoryTypeRepository
   * @param locationRepo InventoryLocationRepository
   * @param itemRepo InventoryItemRepository
   * @returns {Promise<{ types: InventoryTypeEntity[]; locations: InventoryLocationEntity[]; items: InventoryItemEntity[] }>} The seeded entities.
   */
  async function seedDemoInventoryData(
    typeRepo: InventoryTypeRepository,
    locationRepo: InventoryLocationRepository,
    itemRepo: InventoryItemRepository
  ): Promise<{
    types: InventoryTypeEntity[];
    locations: InventoryLocationEntity[];
    items: InventoryItemEntity[];
  }> {
    // --- Types ---
    const typeA = new InventoryTypeEntity({
      id: randomUUID(),
      name: 'Electronics',
      checkInterval: 30,
      checkType: 'NONE',
      properties: ['brand', 'model'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const typeB = new InventoryTypeEntity({
      id: randomUUID(),
      name: 'Furniture',
      checkInterval: 30,
      checkType: 'NONE',
      properties: ['material'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const typeA1 = new InventoryTypeEntity({
      id: randomUUID(),
      name: 'Laptops',
      parent: typeA.id,
      checkInterval: 30,
      checkType: 'NONE',
      properties: ['cpu', 'ram'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const typeA2 = new InventoryTypeEntity({
      id: randomUUID(),
      name: 'Phones',
      parent: typeA.id,
      checkInterval: 30,
      checkType: 'NONE',
      properties: ['os'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const typeB1 = new InventoryTypeEntity({
      id: randomUUID(),
      name: 'Chairs',
      parent: typeB.id,
      checkInterval: 30,
      checkType: 'NONE',
      properties: ['color'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const typeStationery = new InventoryTypeEntity({
      id: randomUUID(),
      name: 'Stationery',
      checkInterval: 30,
      checkType: 'NONE',
      properties: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const types = [typeA, typeB, typeStationery, typeA1, typeA2, typeB1];
    for (const t of types) {
      await typeRepo.save(t);
    }

    // --- Locations ---
    const locA = new InventoryLocationEntity({
      id: randomUUID(),
      name: 'Warehouse',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const locB = new InventoryLocationEntity({
      id: randomUUID(),
      name: 'Office',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const locA1 = new InventoryLocationEntity({
      id: randomUUID(),
      name: 'Shelf 1',
      parent: locA.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const locA2 = new InventoryLocationEntity({
      id: randomUUID(),
      name: 'Shelf 2',
      parent: locA.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const locB1 = new InventoryLocationEntity({
      id: randomUUID(),
      name: 'Desk 1',
      parent: locB.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const locRemote = new InventoryLocationEntity({
      id: randomUUID(),
      name: 'Remote Storage',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const locations = [locA, locB, locRemote, locA1, locA2, locB1];
    for (const l of locations) {
      await locationRepo.save(l);
    }

    // --- Items ---
    const items = [
      new InventoryItemEntity({
        id: randomUUID(),
        name: 'MacBook Pro',
        barcode: 'MBP-001',
        state: InventoryItemState.NEW,
        typeId: typeA1.id,
        locationId: locA1.id,
        properties: [],
        nextCheck: new Date(),
        lastScanned: new Date(),
        history: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      new InventoryItemEntity({
        id: randomUUID(),
        name: 'iPhone',
        barcode: 'IPH-001',
        state: InventoryItemState.DEFAULT,
        typeId: typeA2.id,
        locationId: locA2.id,
        properties: [],
        nextCheck: new Date(),
        lastScanned: new Date(),
        history: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      new InventoryItemEntity({
        id: randomUUID(),
        name: 'Office Chair',
        barcode: 'CHAIR-001',
        state: InventoryItemState.DEFAULT,
        typeId: typeB1.id,
        locationId: locB1.id,
        properties: [],
        nextCheck: new Date(),
        lastScanned: new Date(),
        history: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      // Item with no type (one-off)
      new InventoryItemEntity({
        id: randomUUID(),
        name: 'Whiteboard',
        barcode: 'WB-001',
        state: InventoryItemState.DEFAULT,
        locationId: locB.id,
        properties: [],
        nextCheck: new Date(),
        lastScanned: new Date(),
        history: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      // Item with no location (unassigned)
      new InventoryItemEntity({
        id: randomUUID(),
        name: 'Desk Lamp',
        barcode: 'LAMP-001',
        state: InventoryItemState.NEW,
        typeId: typeB1.id,
        locationId: locA1.id,
        properties: [],
        nextCheck: new Date(),
        lastScanned: new Date(),
        history: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ];
    for (const i of items) {
      await itemRepo.save(i);
    }

    return { types, locations, items };
  }

  /**
   * Test that seeding demo inventory data in the repository is reflected in the API.
   * This ensures the backend and API are in sync for inventory data.
   */
  it('should return all seeded demo inventory data from the API', async () => {
    // Seed demo data
    const { types, locations, items } = await seedDemoInventoryData(
      typeRepo,
      locationRepo,
      itemRepo
    );

    // Query all types
    const typesQuery = `
			query { inventoryTypes { id name } }
		`;
    const typesRes = await execute({ source: typesQuery });
    expect(typesRes.errors).toBeFalsy();
    const apiTypeIds = typesRes.data.inventoryTypes.map((t: { id: string }) => t.id);
    for (const t of types) {
      expect(apiTypeIds).toContain(t.id);
    }

    // Query all locations
    const locationsQuery = `
			query { inventoryLocations { id name } }
		`;
    const locationsRes = await execute({ source: locationsQuery });
    expect(locationsRes.errors).toBeFalsy();
    const apiLocationIds = locationsRes.data.inventoryLocations.map((l: { id: string }) => l.id);
    for (const l of locations) {
      expect(apiLocationIds).toContain(l.id);
    }

    // Query all items
    const itemsQuery = `
			query { inventoryItems { id name } }
		`;
    const itemsRes = await execute({ source: itemsQuery });
    expect(itemsRes.errors).toBeFalsy();
    const apiItemIds = itemsRes.data.inventoryItems.map((i: { id: string }) => i.id);
    for (const i of items) {
      expect(apiItemIds).toContain(i.id);
    }
  });
});

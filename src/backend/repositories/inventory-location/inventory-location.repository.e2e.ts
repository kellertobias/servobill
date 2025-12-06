// @vitest-environment node
// @vitest-execute serial

import 'reflect-metadata';
import { randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it } from 'vitest';
import { InventoryLocationEntity } from '@/backend/entities/inventory-location.entity';
import { prepareRepoTest } from '@/test/repo-test';
import type { InventoryLocationRepository } from './interface';
import { InventoryLocationDynamoDBRepository } from './inventory-location.dynamodb-repository';
import { InventoryLocationRelationalRepository } from './inventory-location.relational-repository';
import { InventoryLocationOrmEntity } from './relational-orm-entity';

/**
 * Parameterized test suite for both repository implementations.
 */
const repoTestCases = prepareRepoTest<InventoryLocationRepository>({
  name: 'InventoryLocation',
  relational: InventoryLocationRelationalRepository,
  dynamodb: InventoryLocationDynamoDBRepository,
  relationalOrmEntity: InventoryLocationOrmEntity,
});

describe.each(repoTestCases)('$name (E2E)', ({ setup, onBeforeEach }) => {
  beforeEach(async () => {
    await onBeforeEach();
  });

  it('should create, get, and delete an inventory location', async () => {
    const { app, RepositoryImplementation } = await setup();
    const repo = app.create<InventoryLocationRepository>(RepositoryImplementation);

    const id = randomUUID();
    const location = new InventoryLocationEntity({
      id,
      name: 'Test Location',
    });
    await repo.createWithId(location.id);
    await repo.save(location);

    const retrievedLocation = await repo.getById(location.id);
    expect(retrievedLocation).toBeDefined();
    expect(retrievedLocation!.id).toBe(location.id);
    expect(retrievedLocation!.name).toBe('Test Location');

    await repo.delete(id);
    const afterDelete = await repo.getById(id);
    expect(afterDelete).toBeNull();
  });

  it('should list inventory locations using listByQuery', async () => {
    const { app, RepositoryImplementation } = await setup();
    const repo = app.create<InventoryLocationRepository>(RepositoryImplementation);

    const id1 = randomUUID();
    const id2 = randomUUID();

    const locations = [
      new InventoryLocationEntity({
        id: id1,
        name: 'Location 2',
      }),
      new InventoryLocationEntity({
        id: id2,
        name: 'Location 3',
      }),
    ];

    for (const location of locations) {
      const createdLocation = await repo.createWithId(location.id);
      createdLocation.updateName(location.name);
      await repo.save(createdLocation);

      const retrievedLocation = await repo.getById(location.id);
      expect(retrievedLocation).toBeDefined();
    }

    const allLocations = await repo.listByQuery({});
    const allIds = allLocations.map((l) => l.id);
    expect(allIds).toEqual(expect.arrayContaining([id1, id2]));

    for (const location of locations) {
      await repo.delete(location.id);
    }
  });

  it('should store and retrieve parent location relationships', async () => {
    const { app, RepositoryImplementation } = await setup();
    const repo = app.create<InventoryLocationRepository>(RepositoryImplementation);

    const parentId = randomUUID();
    const childId = randomUUID();

    const parent = await repo.createWithId(parentId);
    parent.updateName('Parent Location');
    await repo.save(parent);

    const child = await repo.createWithId(childId);
    child.updateName('Child Location');
    child.updateParent(parentId);
    await repo.save(child);

    const retrievedChild = await repo.getById(childId);
    expect(retrievedChild).toBeDefined();
    expect(retrievedChild!.parent).toBe(parentId);

    // Query by parent
    const children = await repo.listByQuery({ where: { parent: parentId } });
    expect(children.map((c) => c.id)).toContain(childId);

    await repo.delete(childId);
    await repo.delete(parentId);
  });

  /**
   * Test that verifies the repository can list all root inventory locations (locations with no parent).
   * This ensures that listByQuery correctly filters locations where the parent field is null or undefined.
   * Uses the supported `rootOnly: true` filter in the query.
   */
  it('should list all root inventory locations (no parent)', async () => {
    const { app, RepositoryImplementation } = await setup();
    const repo = app.create<InventoryLocationRepository>(RepositoryImplementation);

    // Create root locations
    const rootId1 = randomUUID();
    const rootId2 = randomUUID();
    const root1 = await repo.createWithId(rootId1);
    root1.updateName('Root Location 1');
    await repo.save(root1);
    const root2 = await repo.createWithId(rootId2);
    root2.updateName('Root Location 2');
    await repo.save(root2);

    // Create a child location
    const childId = randomUUID();
    const child = await repo.createWithId(childId);
    child.updateName('Child Location');
    child.updateParent(rootId1);
    await repo.save(child);

    // Query for root locations using rootOnly: true
    const roots = await repo.listByQuery({ where: { rootOnly: true } });
    const rootIds = roots.map((l) => l.id);

    expect(rootIds).toEqual(expect.arrayContaining([rootId1, rootId2]));
    expect(rootIds).not.toContain(childId);

    // Cleanup
    await repo.delete(childId);
    await repo.delete(rootId1);
    await repo.delete(rootId2);
  });
});

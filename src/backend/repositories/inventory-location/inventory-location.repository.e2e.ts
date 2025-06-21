// @vitest-environment node
// @vitest-execute serial

import 'reflect-metadata';
import { randomUUID } from 'crypto';

import { describe, it, expect, beforeEach } from 'vitest';

import { InventoryLocationDynamoDBRepository } from './inventory-location.dynamodb-repository';
import { InventoryLocationRelationalRepository } from './inventory-location.relational-repository';
import { InventoryLocationOrmEntity } from './relational-orm-entity';
import { InventoryLocationRepository } from './interface';

import { InventoryLocationEntity } from '@/backend/entities/inventory-location.entity';
import { prepareRepoTest } from '@/test/repo-test';

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
		const repo = app.create<InventoryLocationRepository>(
			RepositoryImplementation,
		);

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
		const repo = app.create<InventoryLocationRepository>(
			RepositoryImplementation,
		);

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
});

// @vitest-environment node
// @vitest-execute serial

import 'reflect-metadata';
import { randomUUID } from 'crypto';

import { describe, it, expect, beforeEach } from 'vitest';

import { InventoryItemDynamoDBRepository } from './inventory-item.dynamodb-repository';
import { InventoryItemRelationalRepository } from './inventory-item.relational-repository';
import { InventoryItemOrmEntity } from './relational-orm-entity';
import { InventoryItemRepository } from './interface';

import {
	InventoryItemEntity,
	InventoryItemState,
} from '@/backend/entities/inventory-item.entity';
import { prepareRepoTest } from '@/test/repo-test';

/**
 * Parameterized test suite for both repository implementations.
 */
const repoTestCases = prepareRepoTest<InventoryItemRepository>({
	name: 'InventoryItem',
	relational: InventoryItemRelationalRepository,
	dynamodb: InventoryItemDynamoDBRepository,
	relationalOrmEntity: InventoryItemOrmEntity,
});

describe.each(repoTestCases)('$name (E2E)', ({ setup, onBeforeEach }) => {
	beforeEach(async () => {
		await onBeforeEach();
	});

	it('should create, get, and delete an inventory item', async () => {
		const { repo } = await setup();

		const id = randomUUID();
		const locationId = randomUUID();
		const typeId = randomUUID();

		const item = new InventoryItemEntity({
			id,
			name: 'Test Item',
			barcode: '123456789',
			locationId,
			typeId,
			state: InventoryItemState.NEW,
			properties: [
				['color', 'red'],
				['size', 'large'],
			],
			nextCheck: new Date('2024-12-31'),
			lastScanned: new Date(),
		});

		await repo.createWithId(item.id);
		await repo.save(item);

		const retrievedItem = await repo.getById(item.id);
		expect(retrievedItem).toBeDefined();
		expect(retrievedItem!.id).toBe(item.id);
		expect(retrievedItem!.name).toBe('Test Item');
		expect(retrievedItem!.barcode).toBe('123456789');
		expect(retrievedItem!.locationId).toBe(locationId);
		expect(retrievedItem!.typeId).toBe(typeId);
		expect(retrievedItem!.state).toBe(InventoryItemState.NEW);
		expect(retrievedItem!.properties).toEqual([
			['color', 'red'],
			['size', 'large'],
		]);

		await repo.delete(id);
		const afterDelete = await repo.getById(id);
		expect(afterDelete).toBeNull();
	});

	it('should list inventory items using listByQuery', async () => {
		const { repo } = await setup();

		const id1 = randomUUID();
		const id2 = randomUUID();
		const locationId = randomUUID();
		const typeId = randomUUID();

		const items = [
			new InventoryItemEntity({
				id: id1,
				name: 'Laptop',
				barcode: 'LAP001',
				locationId,
				typeId,
				state: InventoryItemState.DEFAULT,
				properties: [
					['brand', 'Dell'],
					['model', 'XPS'],
				],
				nextCheck: new Date('2024-12-31'),
				lastScanned: new Date(),
			}),
			new InventoryItemEntity({
				id: id2,
				name: 'Monitor',
				barcode: 'MON001',
				locationId,
				typeId,
				state: InventoryItemState.DEFAULT,
				properties: [
					['brand', 'Samsung'],
					['size', '27"'],
				],
				nextCheck: new Date('2024-12-31'),
				lastScanned: new Date(),
			}),
		];

		for (const item of items) {
			const createdItem = await repo.createWithId(item.id);
			createdItem.updateName(item.name!);
			createdItem.updateBarcode(item.barcode!);
			createdItem.updateLocation(item.locationId);
			createdItem.updateTypeId(item.typeId!);
			createdItem.updateState(item.state);
			createdItem.updateProperties(item.properties);
			createdItem.updateNextCheck(item.nextCheck);
			await repo.save(createdItem);

			const retrievedItem = await repo.getById(item.id);
			expect(retrievedItem).toBeDefined();
		}

		const allItems = await repo.listByQuery({});
		const allIds = allItems.map((i) => i.id);
		expect(allIds).toEqual(expect.arrayContaining([id1, id2]));

		for (const item of items) {
			await repo.delete(item.id);
		}
	});

	it('should support filtering by location', async () => {
		const { repo } = await setup();

		const locationId1 = randomUUID();
		const locationId2 = randomUUID();
		const typeId = randomUUID();

		const items = [
			new InventoryItemEntity({
				id: randomUUID(),
				name: 'Item in Location 1',
				locationId: locationId1,
				typeId,
				state: InventoryItemState.DEFAULT,
				properties: [],
				nextCheck: new Date('2024-12-31'),
				lastScanned: new Date(),
			}),
			new InventoryItemEntity({
				id: randomUUID(),
				name: 'Item in Location 2',
				locationId: locationId2,
				typeId,
				state: InventoryItemState.DEFAULT,
				properties: [],
				nextCheck: new Date('2024-12-31'),
				lastScanned: new Date(),
			}),
		];

		// Create items
		for (const item of items) {
			const createdItem = await repo.createWithId(item.id);
			createdItem.updateName(item.name!);
			createdItem.updateLocation(item.locationId);
			createdItem.updateTypeId(item.typeId!);
			createdItem.updateState(item.state);
			createdItem.updateProperties(item.properties);
			createdItem.updateNextCheck(item.nextCheck);
			await repo.save(createdItem);
		}

		// Test filtering by location
		const location1Items = await repo.listByQuery({
			where: { locationId: locationId1 },
		});
		expect(location1Items).toHaveLength(1);
		expect(location1Items[0].locationId).toBe(locationId1);

		const location2Items = await repo.listByQuery({
			where: { locationId: locationId2 },
		});
		expect(location2Items).toHaveLength(1);
		expect(location2Items[0].locationId).toBe(locationId2);

		// Cleanup
		for (const item of items) {
			await repo.delete(item.id);
		}
	});

	it('should support filtering by state', async () => {
		const { repo } = await setup();

		const locationId = randomUUID();
		const typeId = randomUUID();

		const items = [
			new InventoryItemEntity({
				id: randomUUID(),
				name: 'New Item',
				locationId,
				typeId,
				state: InventoryItemState.NEW,
				properties: [],
				nextCheck: new Date('2024-12-31'),
				lastScanned: new Date(),
			}),
			new InventoryItemEntity({
				id: randomUUID(),
				name: 'Broken Item',
				locationId,
				typeId,
				state: InventoryItemState.BROKEN,
				properties: [],
				nextCheck: new Date('2024-12-31'),
				lastScanned: new Date(),
			}),
		];

		// Create items
		for (const item of items) {
			const createdItem = await repo.createWithId(item.id);
			createdItem.updateName(item.name!);
			createdItem.updateLocation(item.locationId);
			createdItem.updateTypeId(item.typeId!);
			createdItem.updateState(item.state);
			createdItem.updateProperties(item.properties);
			createdItem.updateNextCheck(item.nextCheck);
			await repo.save(createdItem);
		}

		// Test filtering by state
		const newItems = await repo.listByQuery({
			where: { state: InventoryItemState.NEW },
		});
		expect(newItems).toHaveLength(1);
		expect(newItems[0].state).toBe(InventoryItemState.NEW);

		const brokenItems = await repo.listByQuery({
			where: { state: InventoryItemState.BROKEN },
		});
		expect(brokenItems).toHaveLength(1);
		expect(brokenItems[0].state).toBe(InventoryItemState.BROKEN);

		// Cleanup
		for (const item of items) {
			await repo.delete(item.id);
		}
	});

	it('should support filtering by type', async () => {
		const { repo } = await setup();

		const locationId = randomUUID();
		const typeId1 = randomUUID();
		const typeId2 = randomUUID();

		const items = [
			new InventoryItemEntity({
				id: randomUUID(),
				name: 'Item of Type 1',
				locationId,
				typeId: typeId1,
				state: InventoryItemState.DEFAULT,
				properties: [],
				nextCheck: new Date('2024-12-31'),
				lastScanned: new Date(),
			}),
			new InventoryItemEntity({
				id: randomUUID(),
				name: 'Item of Type 2',
				locationId,
				typeId: typeId2,
				state: InventoryItemState.DEFAULT,
				properties: [],
				nextCheck: new Date('2024-12-31'),
				lastScanned: new Date(),
			}),
		];

		// Create items
		for (const item of items) {
			const createdItem = await repo.createWithId(item.id);
			createdItem.updateName(item.name!);
			createdItem.updateLocation(item.locationId);
			createdItem.updateTypeId(item.typeId!);
			createdItem.updateState(item.state);
			createdItem.updateProperties(item.properties);
			createdItem.updateNextCheck(item.nextCheck);
			await repo.save(createdItem);
		}

		// Test filtering by type
		const type1Items = await repo.listByQuery({ where: { typeId: typeId1 } });
		expect(type1Items).toHaveLength(1);
		expect(type1Items[0].typeId).toBe(typeId1);

		const type2Items = await repo.listByQuery({ where: { typeId: typeId2 } });
		expect(type2Items).toHaveLength(1);
		expect(type2Items[0].typeId).toBe(typeId2);

		// Cleanup
		for (const item of items) {
			await repo.delete(item.id);
		}
	});

	it('should support filtering by typeId null (one-off items)', async () => {
		const { repo } = await setup();

		const locationId = randomUUID();
		const typeId = randomUUID();

		const items = [
			new InventoryItemEntity({
				id: randomUUID(),
				name: 'Typed Item',
				locationId,
				typeId: typeId,
				state: InventoryItemState.DEFAULT,
				properties: [],
				nextCheck: new Date('2024-12-31'),
				lastScanned: new Date(),
			}),
			new InventoryItemEntity({
				id: randomUUID(),
				name: 'One-off Item',
				locationId,
				typeId: undefined, // No type - one-off item
				state: InventoryItemState.DEFAULT,
				properties: [],
				nextCheck: new Date('2024-12-31'),
				lastScanned: new Date(),
			}),
		];

		// Create items
		for (const item of items) {
			const createdItem = await repo.createWithId(item.id);
			createdItem.updateName(item.name!);
			createdItem.updateLocation(item.locationId);
			createdItem.updateTypeId(item.typeId); // This will be undefined for the one-off item
			createdItem.updateState(item.state);
			createdItem.updateProperties(item.properties);
			createdItem.updateNextCheck(item.nextCheck);
			await repo.save(createdItem);
		}

		// Test filtering by typeId null (one-off items)
		const oneOffItems = await repo.listByQuery({ where: { typeId: null } });
		expect(oneOffItems).toHaveLength(1);
		expect(oneOffItems[0].name).toBe('One-off Item');
		expect(oneOffItems[0].typeId).toBeFalsy();

		// Test filtering by specific typeId
		const typedItems = await repo.listByQuery({ where: { typeId: typeId } });
		expect(typedItems).toHaveLength(1);
		expect(typedItems[0].name).toBe('Typed Item');
		expect(typedItems[0].typeId).toBe(typeId);

		// Cleanup
		for (const item of items) {
			await repo.delete(item.id);
		}
	});

	it('should support finding items by barcode', async () => {
		const { repo } = await setup();

		const locationId = randomUUID();
		const typeId = randomUUID();
		const barcode = 'UNIQUE123';

		const item = new InventoryItemEntity({
			id: randomUUID(),
			name: 'Barcoded Item',
			barcode,
			locationId,
			typeId,
			state: InventoryItemState.DEFAULT,
			properties: [],
			nextCheck: new Date('2024-12-31'),
			lastScanned: new Date(),
		});

		// Create item
		const createdItem = await repo.createWithId(item.id);
		createdItem.updateName(item.name!);
		createdItem.updateBarcode(item.barcode!);
		createdItem.updateLocation(item.locationId);
		createdItem.updateTypeId(item.typeId!);
		createdItem.updateState(item.state);
		createdItem.updateProperties(item.properties);
		createdItem.updateNextCheck(item.nextCheck);
		await repo.save(createdItem);

		// Test finding by barcode
		const foundItem = await repo.findByBarcode(barcode);
		expect(foundItem).toBeDefined();
		expect(foundItem!.barcode).toBe(barcode);
		expect(foundItem!.id).toBe(item.id);

		// Test finding non-existent barcode
		const notFound = await repo.findByBarcode('NONEXISTENT');
		expect(notFound).toBeNull();

		// Cleanup
		await repo.delete(item.id);
	});

	it('should support filtering by overdue status', async () => {
		const { repo } = await setup();

		const locationId = randomUUID();
		const typeId = randomUUID();

		const items = [
			new InventoryItemEntity({
				id: randomUUID(),
				name: 'Overdue Item',
				locationId,
				typeId,
				state: InventoryItemState.DEFAULT,
				properties: [],
				nextCheck: new Date('2020-01-01'), // Past date - overdue
				lastScanned: new Date(),
			}),
			new InventoryItemEntity({
				id: randomUUID(),
				name: 'Not Overdue Item',
				locationId,
				typeId,
				state: InventoryItemState.DEFAULT,
				properties: [],
				nextCheck: new Date('2030-01-01'), // Future date - not overdue
				lastScanned: new Date(),
			}),
		];

		// Create items
		for (const item of items) {
			const createdItem = await repo.createWithId(item.id);
			createdItem.updateName(item.name!);
			createdItem.updateLocation(item.locationId);
			createdItem.updateTypeId(item.typeId!);
			createdItem.updateState(item.state);
			createdItem.updateProperties(item.properties);
			createdItem.updateNextCheck(item.nextCheck);
			await repo.save(createdItem);
		}

		// Test filtering by overdue status
		const overdueItems = await repo.listByQuery({ where: { overdue: true } });
		expect(overdueItems).toHaveLength(1);
		expect(overdueItems[0].name).toBe('Overdue Item');

		const notOverdueItems = await repo.listByQuery({
			where: { overdue: false },
		});
		expect(notOverdueItems).toHaveLength(1);
		expect(notOverdueItems[0].name).toBe('Not Overdue Item');

		// Cleanup
		for (const item of items) {
			await repo.delete(item.id);
		}
	});

	it('should support search functionality', async () => {
		const { repo } = await setup();

		const locationId = randomUUID();
		const typeId = randomUUID();

		const items = [
			new InventoryItemEntity({
				id: randomUUID(),
				name: 'Laptop Computer',
				locationId,
				typeId,
				state: InventoryItemState.DEFAULT,
				properties: [],
				nextCheck: new Date('2024-12-31'),
				lastScanned: new Date(),
			}),
			new InventoryItemEntity({
				id: randomUUID(),
				name: 'Desktop Computer',
				locationId,
				typeId,
				state: InventoryItemState.DEFAULT,
				properties: [],
				nextCheck: new Date('2024-12-31'),
				lastScanned: new Date(),
			}),
		];

		// Create items
		for (const item of items) {
			const createdItem = await repo.createWithId(item.id);
			createdItem.updateName(item.name!);
			createdItem.updateLocation(item.locationId);
			createdItem.updateTypeId(item.typeId!);
			createdItem.updateState(item.state);
			createdItem.updateProperties(item.properties);
			createdItem.updateNextCheck(item.nextCheck);
			await repo.save(createdItem);
		}

		// Test search functionality
		const computerResults = await repo.listByQuery({
			where: { search: 'Computer' },
		});
		expect(computerResults).toHaveLength(2);

		const laptopResults = await repo.listByQuery({
			where: { search: 'Laptop' },
		});
		expect(laptopResults).toHaveLength(1);
		expect(laptopResults[0].name).toBe('Laptop Computer');

		// Cleanup
		for (const item of items) {
			await repo.delete(item.id);
		}
	});

	it('should support filtering by barcode', async () => {
		const { repo } = await setup();

		const locationId = randomUUID();
		const typeId = randomUUID();

		const items = [
			new InventoryItemEntity({
				id: randomUUID(),
				name: 'Item with Barcode',
				barcode: 'BARCODE123',
				locationId,
				typeId,
				state: InventoryItemState.DEFAULT,
				properties: [],
				nextCheck: new Date('2024-12-31'),
				lastScanned: new Date(),
			}),
			new InventoryItemEntity({
				id: randomUUID(),
				name: 'Item without Barcode',
				locationId,
				typeId,
				state: InventoryItemState.DEFAULT,
				properties: [],
				nextCheck: new Date('2024-12-31'),
				lastScanned: new Date(),
			}),
		];

		// Create items
		for (const item of items) {
			const createdItem = await repo.createWithId(item.id);
			createdItem.updateName(item.name!);
			if (item.barcode) {
				createdItem.updateBarcode(item.barcode);
			}
			createdItem.updateLocation(item.locationId);
			createdItem.updateTypeId(item.typeId!);
			createdItem.updateState(item.state);
			createdItem.updateProperties(item.properties);
			createdItem.updateNextCheck(item.nextCheck);
			await repo.save(createdItem);
		}

		// Test filtering by barcode
		const barcodeItems = await repo.listByQuery({
			where: { barcode: 'BARCODE123' },
		});
		expect(barcodeItems).toHaveLength(1);
		expect(barcodeItems[0].barcode).toBe('BARCODE123');

		// Cleanup
		for (const item of items) {
			await repo.delete(item.id);
		}
	});

	it('should support pagination with skip and limit', async () => {
		const { repo } = await setup();

		const locationId = randomUUID();
		const typeId = randomUUID();

		const items = [
			new InventoryItemEntity({
				id: randomUUID(),
				name: 'Item 1',
				locationId,
				typeId,
				state: InventoryItemState.DEFAULT,
				properties: [],
				nextCheck: new Date('2024-12-31'),
				lastScanned: new Date(),
			}),
			new InventoryItemEntity({
				id: randomUUID(),
				name: 'Item 2',
				locationId,
				typeId,
				state: InventoryItemState.DEFAULT,
				properties: [],
				nextCheck: new Date('2024-12-31'),
				lastScanned: new Date(),
			}),
			new InventoryItemEntity({
				id: randomUUID(),
				name: 'Item 3',
				locationId,
				typeId,
				state: InventoryItemState.DEFAULT,
				properties: [],
				nextCheck: new Date('2024-12-31'),
				lastScanned: new Date(),
			}),
		];

		// Create items
		for (const item of items) {
			const createdItem = await repo.createWithId(item.id);
			createdItem.updateName(item.name!);
			createdItem.updateLocation(item.locationId);
			createdItem.updateTypeId(item.typeId!);
			createdItem.updateState(item.state);
			createdItem.updateProperties(item.properties);
			createdItem.updateNextCheck(item.nextCheck);
			await repo.save(createdItem);
		}

		// Test pagination
		const firstPage = await repo.listByQuery({ limit: 2 });
		expect(firstPage).toHaveLength(2);

		const secondPage = await repo.listByQuery({ skip: 2, limit: 1 });
		expect(secondPage).toHaveLength(1);

		// Cleanup
		for (const item of items) {
			await repo.delete(item.id);
		}
	});
});

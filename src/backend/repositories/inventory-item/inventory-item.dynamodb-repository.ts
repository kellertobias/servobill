import {
	InventoryItemEntity,
	InventoryItemState,
} from '@/backend/entities/inventory-item.entity';
import { AbstractDynamodbRepository } from '@/backend/repositories/abstract-dynamodb-repository';
import { DatabaseType } from '@/backend/services/constants';
import {
	DYNAMODB_SERVICE,
	EVENTBUS_SERVICE,
} from '@/backend/services/di-tokens';
import type { DynamoDBService } from '@/backend/services/dynamodb.service';
import type { EventBusService } from '@/backend/services/eventbus.service';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';
import { CustomJson } from '@/common/json';
import { shouldRegister } from '../../services/should-register';
import { DYNAMODB_REPOSITORY_TEST_SET } from '../di-tokens';
import { INVENTORY_ITEM_REPOSITORY } from './di-tokens';
import {
	entitySchema,
	type InventoryItemOrmEntity,
} from './dynamodb-orm-entity';
import type { InventoryItemRepository } from './interface';

/**
 * DynamoDB implementation of the InventoryItem repository.
 * Handles CRUD operations for inventory items in DynamoDB.
 */
@Service({
	name: INVENTORY_ITEM_REPOSITORY,
	...shouldRegister(DatabaseType.DYNAMODB),
	addToTestSet: [DYNAMODB_REPOSITORY_TEST_SET],
})
export class InventoryItemDynamoDBRepository
	extends AbstractDynamodbRepository<
		InventoryItemOrmEntity,
		InventoryItemEntity,
		[],
		typeof entitySchema.schema
	>
	implements InventoryItemRepository
{
	protected logger = new Logger('inventory-item-repository');
	protected mainIdName: string = 'inventoryItemId';
	protected storeId: string = 'inventory';

	constructor(
		@Inject(DYNAMODB_SERVICE) private dynamoDb: DynamoDBService,
		@Inject(EVENTBUS_SERVICE) protected eventBus: EventBusService,
	) {
		super();
		this.eventBus = eventBus;
		this.store = this.dynamoDb.getEntity(entitySchema.schema);
	}

	/**
	 * Converts a DynamoDB entity to a domain InventoryItemEntity.
	 */
	public ormToDomainEntitySafe(
		entity: Omit<InventoryItemOrmEntity, 'storeId'>,
	): InventoryItemEntity {
		return new InventoryItemEntity({
			id: entity.inventoryItemId,
			typeId: entity.typeId || undefined,
			name: entity.name,
			barcode: entity.barcode,
			locationId: entity.locationId,
			state: entity.state as InventoryItemState,
			properties: CustomJson.fromJson(entity.properties),
			nextCheck: new Date(entity.nextCheck),
			lastScanned: new Date(entity.lastScanned),
			history: CustomJson.fromJson(entity.history),
			createdAt: new Date(entity.createdAt),
			updatedAt: new Date(entity.updatedAt),
		});
	}

	/**
	 * Converts a domain InventoryItemEntity to a DynamoDB entity.
	 */
	public domainToOrmEntity(
		domainEntity: InventoryItemEntity,
	): Omit<InventoryItemOrmEntity, 'storeId'> {
		return {
			inventoryItemId: domainEntity.id,
			typeId: domainEntity.typeId || '',
			name: domainEntity.name,
			barcode: domainEntity.barcode,
			locationId: domainEntity.locationId,
			state: domainEntity.state,
			properties: CustomJson.toJson(domainEntity.properties),
			nextCheck: domainEntity.nextCheck.toISOString(),
			lastScanned: domainEntity.lastScanned.toISOString(),
			history: CustomJson.toJson(domainEntity.history),
			createdAt: domainEntity.createdAt.toISOString(),
			updatedAt: domainEntity.updatedAt.toISOString(),
		};
	}

	/**
	 * Generates an empty InventoryItemEntity with the given id.
	 */
	protected generateEmptyItem(id: string): InventoryItemEntity {
		return new InventoryItemEntity({
			id,
			typeId: undefined, // Optional - can be undefined for one-off items
			locationId: '',
			state: InventoryItemState.NEW,
			properties: [],
			nextCheck: new Date(),
			lastScanned: new Date(),
			history: [],
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}

	/**
	 * Lists inventory items based on query parameters.
	 * Uses the byType index for initial filtering and applies additional filters in JavaScript.
	 * @param query The query parameters including filters and pagination
	 * @returns Promise resolving to an array of inventory items
	 */
	public async listByQuery(query: {
		where?: {
			typeId?: string | null;
			locationId?: string;
			state?: InventoryItemState;
			overdue?: boolean;
			search?: string;
			barcode?: string;
		};
		skip?: number;
		limit?: number;
		cursor?: string;
	}): Promise<InventoryItemEntity[]> {
		const { where } = query;

		// Use the byType index for initial filtering
		// If typeId is specified, filter by that type
		// If no typeId is specified, we need to scan all items
		let entities: InventoryItemEntity[] = [];

		if (where?.typeId) {
			// Query items of specific type
			const queryBuilder = this.store.query.byType({
				storeId: this.storeId,
				typeId: where.typeId,
			});
			const result = await queryBuilder.go();
			entities = result.data.map((item) => this.ormToDomainEntity(item));
		} else if (where?.typeId === null) {
			// Query all items (no type filter) - use scan operation
			// Since we don't have a general index, we'll scan all items
			const queryBuilder = this.store.query.byType({
				storeId: this.storeId,
				typeId: '',
			});
			const result = await queryBuilder.go();
			entities = result.data
				.filter((item) => item.storeId === this.storeId)
				.map((item) => this.ormToDomainEntity(item));
		} else {
			// Query all items (no type filter) - use scan operation
			// Since we don't have a general index, we'll scan all items
			const result = await this.store.scan.go();
			entities = result.data
				.filter((item) => item.storeId === this.storeId)
				.map((item) => this.ormToDomainEntity(item));
		}

		// Apply additional filters in JavaScript
		if (where?.locationId) {
			entities = entities.filter(
				(item) => item.locationId === where.locationId,
			);
		}

		if (where?.state) {
			entities = entities.filter((item) => item.state === where.state);
		}

		if (where?.overdue !== undefined) {
			const now = new Date();
			entities = where.overdue
				? entities.filter((item) => item.nextCheck < now)
				: entities.filter((item) => item.nextCheck >= now);
		}

		// Apply search filter if provided
		if (where?.search) {
			const searchTerm = where.search.toLowerCase();
			entities = entities.filter(
				(item) =>
					item.name?.toLowerCase().includes(searchTerm) ||
					item.id.toLowerCase().includes(searchTerm),
			);
		}

		// Apply barcode filter if provided
		if (where?.barcode) {
			entities = entities.filter((item) => item.barcode === where.barcode);
		}

		// Apply pagination
		if (query.skip) {
			entities = entities.slice(query.skip);
		}

		if (query.limit) {
			entities = entities.slice(0, query.limit);
		}

		return entities;
	}

	/**
	 * Finds an inventory item by its barcode and updates the lastScanned timestamp.
	 * @param barcode The barcode to search for
	 * @returns The inventory item or null if not found
	 */
	public async findByBarcode(
		barcode: string,
	): Promise<InventoryItemEntity | null> {
		try {
			// Scan all items and filter by barcode since we don't have a barcode index
			const result = await this.store.scan.go();
			const item = result.data.find(
				(entity: InventoryItemOrmEntity) =>
					entity.storeId === this.storeId && entity.barcode === barcode,
			);

			if (!item) {
				return null;
			}

			// Convert to domain entity
			const domainEntity = this.ormToDomainEntity(item);

			// Update lastScanned timestamp
			domainEntity.lastScanned = new Date();
			domainEntity.updatedAt = new Date();

			// Save the updated entity
			await this.save(domainEntity);

			return domainEntity;
		} catch (error) {
			this.logger.error('Error finding inventory item by barcode', {
				barcode,
				error,
			});
			throw error;
		}
	}

	/**
	 * Counts the number of inventory items for a specific type.
	 * @param typeId The type ID to count items for
	 * @returns The number of items of the specified type
	 */
	public async countByTypeId(typeId: string): Promise<number> {
		try {
			// Query items of specific type using the byType index
			const queryBuilder = this.store.query.byType({
				storeId: this.storeId,
				typeId: typeId,
			});
			const result = await queryBuilder.go();
			return result.data.length;
		} catch (error) {
			this.logger.error('Error counting inventory items by type', {
				typeId,
				error,
			});
			throw error;
		}
	}

	/**
	 * Counts the number of inventory items at a specific location.
	 * @param locationId The location ID to count items for
	 * @returns The number of items at the specified location
	 */
	public async countByLocationId(locationId: string): Promise<number> {
		try {
			// Scan all items and filter by locationId since we don't have a location index
			const result = await this.store.scan.go();
			const itemsAtLocation = result.data.filter(
				(entity: InventoryItemOrmEntity) =>
					entity.storeId === this.storeId && entity.locationId === locationId,
			);
			return itemsAtLocation.length;
		} catch (error) {
			this.logger.error('Error counting inventory items by location', {
				locationId,
				error,
			});
			throw error;
		}
	}
}

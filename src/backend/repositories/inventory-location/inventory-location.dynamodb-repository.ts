import { shouldRegister } from '../../services/should-register';
import { DYNAMODB_REPOSITORY_TEST_SET } from '../di-tokens';

import {
	entitySchema,
	InventoryLocationOrmEntity,
} from './dynamodb-orm-entity';
import { InventoryLocationRepository } from './interface';
import { INVENTORY_LOCATION_REPOSITORY } from './di-tokens';

import { AbstractDynamodbRepository } from '@/backend/repositories/abstract-dynamodb-repository';
import type { DynamoDBService } from '@/backend/services/dynamodb.service';
import { InventoryLocationEntity } from '@/backend/entities/inventory-location.entity';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';
import { DatabaseType } from '@/backend/services/constants';
import {
	DYNAMODB_SERVICE,
	EVENTBUS_SERVICE,
} from '@/backend/services/di-tokens';
import type { EventBusService } from '@/backend/services/eventbus.service';

/**
 * DynamoDB implementation of the InventoryLocation repository.
 * Handles CRUD operations for inventory locations in DynamoDB.
 */
@Service({
	name: INVENTORY_LOCATION_REPOSITORY,
	...shouldRegister(DatabaseType.DYNAMODB),
	addToTestSet: [DYNAMODB_REPOSITORY_TEST_SET],
})
export class InventoryLocationDynamoDBRepository
	extends AbstractDynamodbRepository<
		InventoryLocationOrmEntity,
		InventoryLocationEntity,
		[],
		typeof entitySchema.schema
	>
	implements InventoryLocationRepository
{
	protected logger = new Logger('inventory-location-repository');
	protected mainIdName: string = 'inventoryLocationId';
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
	 * Converts a DynamoDB entity to a domain InventoryLocationEntity.
	 */
	public ormToDomainEntitySafe(
		entity: Omit<InventoryLocationOrmEntity, 'storeId'>,
	): InventoryLocationEntity {
		return new InventoryLocationEntity({
			id: entity.inventoryLocationId,
			name: entity.name,
			barcode: entity.barcode,
			createdAt: new Date(entity.createdAt),
			updatedAt: new Date(entity.updatedAt),
		});
	}

	/**
	 * Converts a domain InventoryLocationEntity to a DynamoDB entity.
	 */
	public domainToOrmEntity(
		domainEntity: InventoryLocationEntity,
	): Omit<InventoryLocationOrmEntity, 'storeId'> {
		return {
			inventoryLocationId: domainEntity.id,
			name: domainEntity.name,
			searchName: domainEntity.name.toLowerCase(),
			barcode: domainEntity.barcode,
			createdAt: domainEntity.createdAt.toISOString(),
			updatedAt: domainEntity.updatedAt.toISOString(),
		};
	}

	/**
	 * Generates an empty InventoryLocationEntity with the given id.
	 */
	protected generateEmptyItem(id: string): InventoryLocationEntity {
		return new InventoryLocationEntity({
			id,
			name: '',
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}

	private getQueryBuilder(query: {
		where?: { search?: string; barcode?: string; parent?: string };
		skip?: number;
		limit?: number;
		cursor?: string;
	}) {
		if (query.where?.search) {
			return this.store.query
				.byName({
					storeId: this.storeId,
				})
				.begins({
					searchName: query.where.search.toLowerCase(),
				});
		}

		return this.store.query.byName({
			storeId: this.storeId,
		});
	}

	/**
	 * Lists inventory locations based on query parameters.
	 * @param query The query parameters including filters and pagination
	 * @returns Promise resolving to an array of inventory locations
	 */
	public async listByQuery(query: {
		where?: { search?: string; barcode?: string; parent?: string };
		skip?: number;
		limit?: number;
		cursor?: string;
	}): Promise<InventoryLocationEntity[]> {
		const queryBuilder = this.getQueryBuilder(query);

		const data = await queryBuilder.go();
		let entities = data.data.map((elm: InventoryLocationOrmEntity) =>
			this.ormToDomainEntity(elm),
		);

		// Apply barcode filter if provided
		if (query.where?.barcode) {
			entities = entities.filter(
				(item) => item.barcode === query.where!.barcode,
			);
		}

		// Apply parent filter if provided
		if (query.where?.parent) {
			entities = entities.filter((item) => item.parent === query.where!.parent);
		}

		return entities;
	}

	/**
	 * Finds an inventory location by its barcode.
	 * @param barcode The barcode to search for
	 * @returns The inventory location or null if not found
	 */
	public async findByBarcode(
		barcode: string,
	): Promise<InventoryLocationEntity | null> {
		try {
			// Query all locations and filter by barcode since we don't have a barcode index
			const queryBuilder = this.store.query.byName({
				storeId: this.storeId,
			});

			const data = await queryBuilder.go();
			const location = data.data.find(
				(item: InventoryLocationOrmEntity) => item.barcode === barcode,
			);

			return location ? this.ormToDomainEntity(location) : null;
		} catch (error) {
			this.logger.error('Error finding inventory location by barcode', {
				barcode,
				error,
			});
			throw error;
		}
	}
}

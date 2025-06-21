import {
	IndexCompositeAttributes,
	QueryBranches,
	QueryOperations,
	ResponseItem,
} from 'electrodb';

import { shouldRegister } from '../../services/should-register';

import {
	entitySchema,
	InventoryLocationOrmEntity,
} from './dynamodb-orm-entity';
import { InventoryLocationRepository } from './interface';
import { INVENTORY_LOCATION_REPOSITORY } from './di-tokens';

import { AbstractDynamodbRepository } from '@/backend/repositories/abstract-dynamodb-repository';
import { DynamoDBService } from '@/backend/services/dynamodb.service';
import { InventoryLocationEntity } from '@/backend/entities/inventory-location.entity';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';
import { DatabaseType } from '@/backend/services/constants';

type InventoryLocationSchema = typeof entitySchema.schema;
type InventoryLocationSchemaResponseItem = ResponseItem<
	string,
	string,
	string,
	InventoryLocationSchema
>;

/**
 * DynamoDB implementation of the InventoryLocation repository.
 * Handles CRUD operations for inventory locations in DynamoDB.
 */
@Service({
	name: INVENTORY_LOCATION_REPOSITORY,
	...shouldRegister(DatabaseType.DYNAMODB),
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

	constructor(@Inject(DynamoDBService) private dynamoDb: DynamoDBService) {
		super();
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

	/**
	 * Lists inventory locations based on query parameters.
	 * @param query The query parameters including filters and pagination
	 * @returns Promise resolving to an array of inventory locations
	 */
	public async listByQuery(query: {
		where?: { search?: string; barcode?: string };
		skip?: number;
		limit?: number;
		cursor?: string;
	}): Promise<InventoryLocationEntity[]> {
		const queryBuilder = this.store.query.byName({
			storeId: this.storeId,
		});

		let queryExecutor:
			| QueryBranches<
					string,
					string,
					string,
					InventoryLocationSchema,
					InventoryLocationSchemaResponseItem,
					IndexCompositeAttributes<
						string,
						string,
						string,
						InventoryLocationSchema,
						'byName'
					>
			  >
			| QueryOperations<
					string,
					string,
					string,
					InventoryLocationSchema,
					unknown,
					InventoryLocationSchemaResponseItem,
					IndexCompositeAttributes<
						string,
						string,
						string,
						InventoryLocationSchema,
						'byName'
					>
			  > = queryBuilder;
		if (query.where?.search) {
			queryExecutor = queryBuilder.begins({
				searchName: query.where.search.toLowerCase(),
			});
		}

		const data = await queryExecutor.go();
		let entities = data.data.map((elm: InventoryLocationOrmEntity) =>
			this.ormToDomainEntity(elm),
		);

		// Apply barcode filter if provided
		if (query.where?.barcode) {
			entities = entities.filter(
				(item) => item.barcode === query.where!.barcode,
			);
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

import {
	IndexCompositeAttributes,
	QueryBranches,
	QueryOperations,
	ResponseItem,
} from 'electrodb';

import { shouldRegister } from '../../services/should-register';

import { entitySchema, InventoryTypeOrmEntity } from './dynamodb-orm-entity';
import { InventoryTypeRepository } from './interface';
import { INVENTORY_TYPE_REPOSITORY } from './di-tokens';

import { AbstractDynamodbRepository } from '@/backend/repositories/abstract-dynamodb-repository';
import type { DynamoDBService } from '@/backend/services/dynamodb.service';
import { InventoryTypeEntity } from '@/backend/entities/inventory-type.entity';
import { CustomJson } from '@/common/json';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';
import { DatabaseType } from '@/backend/services/constants';
import {
	DYNAMODB_SERVICE,
	EVENTBUS_SERVICE,
} from '@/backend/services/di-tokens';
import type { EventBusService } from '@/backend/services/eventbus.service';

type InventoryTypeSchema = typeof entitySchema.schema;
type InventoryTypeSchemaResponseItem = ResponseItem<
	string,
	string,
	string,
	InventoryTypeSchema
>;

/**
 * DynamoDB implementation of the InventoryType repository.
 * Handles CRUD operations for inventory types in DynamoDB.
 */
@Service({
	name: INVENTORY_TYPE_REPOSITORY,
	...shouldRegister(DatabaseType.DYNAMODB),
})
export class InventoryTypeDynamoDBRepository
	extends AbstractDynamodbRepository<
		InventoryTypeOrmEntity,
		InventoryTypeEntity,
		[],
		typeof entitySchema.schema
	>
	implements InventoryTypeRepository
{
	protected logger = new Logger('inventory-type-repository');
	protected mainIdName: string = 'inventoryTypeId';
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
	 * Converts a DynamoDB entity to a domain InventoryTypeEntity.
	 */
	public ormToDomainEntitySafe(
		entity: Omit<InventoryTypeOrmEntity, 'storeId'>,
	): InventoryTypeEntity {
		return new InventoryTypeEntity({
			id: entity.inventoryTypeId,
			name: entity.name,
			checkInterval: entity.checkInterval,
			checkType: entity.checkType,
			properties: entity.properties
				? CustomJson.fromJson(entity.properties)
				: [],
			parent: entity.parent,
			createdAt: new Date(entity.createdAt),
			updatedAt: new Date(entity.updatedAt),
		});
	}

	/**
	 * Converts a domain InventoryTypeEntity to a DynamoDB entity.
	 */
	public domainToOrmEntity(
		domainEntity: InventoryTypeEntity,
	): Omit<InventoryTypeOrmEntity, 'storeId'> {
		return {
			inventoryTypeId: domainEntity.id,
			name: domainEntity.name,
			searchName: domainEntity.name.toLowerCase(),
			checkInterval: domainEntity.checkInterval,
			checkType: domainEntity.checkType,
			properties: CustomJson.toJson(domainEntity.properties),
			parent: domainEntity.parent,
			createdAt: domainEntity.createdAt.toISOString(),
			updatedAt: domainEntity.updatedAt.toISOString(),
		};
	}

	/**
	 * Generates an empty InventoryTypeEntity with the given id.
	 */
	protected generateEmptyItem(id: string): InventoryTypeEntity {
		return new InventoryTypeEntity({
			id,
			name: '',
			properties: [],
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}

	/**
	 * Lists inventory types based on query parameters.
	 * @param query The query parameters including filters and pagination
	 * @returns Promise resolving to an array of inventory types
	 */
	public async listByQuery(query: {
		where?: {
			search?: string;
			parent?: string;
			rootOnly?: boolean;
		};
		skip?: number;
		limit?: number;
		cursor?: string;
	}): Promise<InventoryTypeEntity[]> {
		const { where } = query;

		// Build query based on filters
		const queryBuilder = this.store.query.byName({
			storeId: this.storeId,
		});

		let queryExecutor:
			| QueryBranches<
					string,
					string,
					string,
					InventoryTypeSchema,
					InventoryTypeSchemaResponseItem,
					IndexCompositeAttributes<
						string,
						string,
						string,
						InventoryTypeSchema,
						'byName' | 'byId'
					>
			  >
			| QueryOperations<
					string,
					string,
					string,
					InventoryTypeSchema,
					unknown,
					InventoryTypeSchemaResponseItem,
					IndexCompositeAttributes<
						string,
						string,
						string,
						InventoryTypeSchema,
						'byName' | 'byId'
					>
			  > = queryBuilder;

		if (where?.search) {
			queryExecutor = queryBuilder.begins({
				searchName: where.search.toLowerCase(),
			});
		}

		const data = await queryExecutor.go();
		let entities = data.data.map((elm: InventoryTypeOrmEntity) =>
			this.ormToDomainEntity(elm),
		);

		// Apply additional filters
		if (where?.parent) {
			entities = entities.filter((entity) => entity.parent === where.parent);
		}

		if (where?.rootOnly) {
			entities = entities.filter((entity) => !entity.parent);
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
}

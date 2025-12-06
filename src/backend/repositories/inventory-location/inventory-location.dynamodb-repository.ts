import { InventoryLocationEntity } from '@/backend/entities/inventory-location.entity';
import { AbstractDynamodbRepository } from '@/backend/repositories/abstract-dynamodb-repository';
import { DatabaseType } from '@/backend/services/constants';
import { DYNAMODB_SERVICE, EVENTBUS_SERVICE } from '@/backend/services/di-tokens';
import type { DynamoDBService } from '@/backend/services/dynamodb.service';
import type { EventBusService } from '@/backend/services/eventbus.service';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';
import { shouldRegister } from '../../services/should-register';
import { DYNAMODB_REPOSITORY_TEST_SET } from '../di-tokens';
import { INVENTORY_LOCATION_REPOSITORY } from './di-tokens';
import { entitySchema, type InventoryLocationOrmEntity } from './dynamodb-orm-entity';
import type { InventoryLocationRepository } from './interface';

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
    @Inject(EVENTBUS_SERVICE) protected eventBus: EventBusService
  ) {
    super();
    this.eventBus = eventBus;
    this.store = this.dynamoDb.getEntity(entitySchema.schema);
  }

  /**
   * Converts a DynamoDB entity to a domain InventoryLocationEntity.
   * Maps the parent field for hierarchy support.
   */
  public ormToDomainEntitySafe(
    entity: Omit<InventoryLocationOrmEntity, 'storeId'>
  ): InventoryLocationEntity {
    return new InventoryLocationEntity({
      id: entity.inventoryLocationId,
      name: entity.name,
      barcode: entity.barcode,
      parent: entity.parent || undefined,
      createdAt: new Date(entity.createdAt),
      updatedAt: new Date(entity.updatedAt),
    });
  }

  /**
   * Converts a domain InventoryLocationEntity to a DynamoDB entity.
   * Maps the parent field for hierarchy support.
   */
  public domainToOrmEntity(
    domainEntity: InventoryLocationEntity
  ): Omit<InventoryLocationOrmEntity, 'storeId'> {
    return {
      inventoryLocationId: domainEntity.id,
      name: domainEntity.name,
      searchName: domainEntity.name.toLowerCase(),
      barcode: domainEntity.barcode,
      parent: domainEntity.parent ?? undefined,
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
   * Supports filtering by search, barcode, parent, and rootOnly (only locations with no parent).
   * @param query The query parameters including filters and pagination
   * @returns Promise resolving to an array of inventory locations
   */
  public async listByQuery(query: {
    where?: {
      search?: string;
      barcode?: string;
      parent?: string;
      rootOnly?: boolean;
    };
    skip?: number;
    limit?: number;
    cursor?: string;
  }): Promise<InventoryLocationEntity[]> {
    const queryBuilder = this.getQueryBuilder(query);

    const data = await queryBuilder.go();
    let entities = data.data.map((elm: InventoryLocationOrmEntity) =>
      this.ormToDomainEntitySafe(elm)
    );

    // Apply barcode filter if provided
    if (query.where?.barcode) {
      entities = entities.filter((item) => item.barcode === query.where!.barcode);
    }

    // If rootOnly is set, ignore the parent filter and only return root nodes
    if (query.where?.rootOnly) {
      // Only include locations with no parent (root nodes)
      entities = entities.filter(
        (item) =>
          (item.parent === null || item.parent === undefined || item.parent === '') &&
          item.parent !== item.id
      );
    } else if (query.where?.parent) {
      // Only apply parent filter if rootOnly is not set
      entities = entities.filter((item) => item.parent === query.where!.parent);
    }

    return entities;
  }

  /**
   * Finds an inventory location by its barcode.
   * @param barcode The barcode to search for
   * @returns The inventory location or null if not found
   */
  public async findByBarcode(barcode: string): Promise<InventoryLocationEntity | null> {
    try {
      // Query all locations and filter by barcode since we don't have a barcode index
      const queryBuilder = this.store.query.byName({
        storeId: this.storeId,
      });

      const data = await queryBuilder.go();
      const location = data.data.find(
        (item: InventoryLocationOrmEntity) => item.barcode === barcode
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

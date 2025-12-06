import { InventoryItemEntity, InventoryItemState } from '@/backend/entities/inventory-item.entity';
import { AbstractRelationalRepository } from '@/backend/repositories/abstract-relational-repository';
import { DatabaseType } from '@/backend/services/constants';
import { EVENTBUS_SERVICE, RELATIONALDB_SERVICE } from '@/backend/services/di-tokens';
import type { EventBusService } from '@/backend/services/eventbus.service';
import { Logger } from '@/backend/services/logger.service';
import type { RelationalDbService } from '@/backend/services/relationaldb.service';
import { Inject, Service } from '@/common/di';
import { CustomJson } from '@/common/json';
import { shouldRegister } from '../../services/should-register';
import { RELATIONAL_REPOSITORY_TEST_SET } from '../di-tokens';
import { INVENTORY_ITEM_REPOSITORY } from './di-tokens';
import type { InventoryItemRepository } from './interface';
import { InventoryItemOrmEntity } from './relational-orm-entity';

/**
 * Relational database implementation of the InventoryItem repository.
 * Handles CRUD operations for inventory items in PostgreSQL/SQLite.
 */
@Service({
  name: INVENTORY_ITEM_REPOSITORY,
  ...shouldRegister([DatabaseType.SQLITE, DatabaseType.POSTGRES]),
  addToTestSet: [RELATIONAL_REPOSITORY_TEST_SET],
})
export class InventoryItemRelationalRepository
  extends AbstractRelationalRepository<InventoryItemOrmEntity, InventoryItemEntity, []>
  implements InventoryItemRepository
{
  protected logger = new Logger('inventory-item-relational-repository');

  constructor(
    @Inject(RELATIONALDB_SERVICE) db: RelationalDbService,
    @Inject(EVENTBUS_SERVICE) protected eventBus: EventBusService
  ) {
    super({ db, ormEntityClass: InventoryItemOrmEntity });
    this.eventBus = eventBus;
  }

  /**
   * Converts a relational ORM entity to a domain InventoryItemEntity (safe version).
   */
  public ormToDomainEntitySafe(
    ormEntity: Omit<InventoryItemOrmEntity, 'storeId'>
  ): InventoryItemEntity {
    return new InventoryItemEntity({
      id: ormEntity.id,
      typeId: ormEntity.typeId || undefined,
      name: ormEntity.name,
      barcode: ormEntity.barcode,
      locationId: ormEntity.locationId,
      state: ormEntity.state as InventoryItemState,
      properties: ormEntity.properties ? CustomJson.fromJson(ormEntity.properties) : [],
      nextCheck: ormEntity.nextCheck,
      lastScanned: ormEntity.lastScanned,
      history: ormEntity.history ? CustomJson.fromJson(ormEntity.history) : [],
      createdAt: ormEntity.createdAt,
      updatedAt: ormEntity.updatedAt,
    });
  }

  /**
   * Converts a domain InventoryItemEntity to a relational ORM entity.
   */
  public domainToOrmEntity(
    domainEntity: InventoryItemEntity
  ): Omit<InventoryItemOrmEntity, 'storeId'> {
    return {
      id: domainEntity.id,
      typeId: domainEntity.typeId,
      name: domainEntity.name,
      barcode: domainEntity.barcode,
      locationId: domainEntity.locationId,
      state: domainEntity.state,
      properties: CustomJson.toJson(domainEntity.properties),
      nextCheck: domainEntity.nextCheck,
      lastScanned: domainEntity.lastScanned,
      history: CustomJson.toJson(domainEntity.history),
      createdAt: domainEntity.createdAt,
      updatedAt: domainEntity.updatedAt,
    };
  }

  /**
   * Generates an empty InventoryItemEntity with the given id.
   */
  protected generateEmptyItem(id: string): InventoryItemEntity {
    return new InventoryItemEntity({
      id,
      typeId: undefined,
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
   * @param query The query parameters including filters and pagination
   * @returns Promise resolving to an array of inventory items
   */
  public async listByQuery(query: {
    where?: {
      typeId?: string;
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
    await this.initialized.promise;

    const { where, skip, limit } = query;

    // Build query
    const queryBuilder = this.repository!.createQueryBuilder('item');

    // Apply filters
    if (where?.typeId !== undefined) {
      if (where.typeId === null) {
        queryBuilder.andWhere('item.typeId IS NULL');
      } else {
        queryBuilder.andWhere('item.typeId = :typeId', {
          typeId: where.typeId,
        });
      }
    }

    if (where?.locationId) {
      queryBuilder.andWhere('item.locationId = :locationId', {
        locationId: where.locationId,
      });
    }

    if (where?.state) {
      queryBuilder.andWhere('item.state = :state', { state: where.state });
    }

    if (where?.overdue !== undefined) {
      const now = new Date();
      if (where.overdue) {
        queryBuilder.andWhere('item.nextCheck < :now', { now });
      } else {
        queryBuilder.andWhere('item.nextCheck >= :now', { now });
      }
    }

    if (where?.search) {
      const searchTerm = `%${where.search}%`;
      queryBuilder.andWhere('item.name ILIKE :search', { search: searchTerm });
    }

    if (where?.barcode) {
      queryBuilder.andWhere('item.barcode = :barcode', {
        barcode: where.barcode,
      });
    }

    // Apply pagination
    if (skip) {
      queryBuilder.skip(skip);
    }

    if (limit) {
      queryBuilder.take(limit);
    }

    // Order by creation date
    queryBuilder.orderBy('item.createdAt', 'DESC');

    // Execute query
    const ormEntities = await queryBuilder.getMany();

    // Convert to domain entities
    return ormEntities.map((entity) => this.ormToDomainEntitySafe(entity));
  }

  /**
   * Finds an inventory item by its barcode and updates the lastScanned timestamp.
   * @param barcode The barcode to search for
   * @returns The inventory item or null if not found
   */
  public async findByBarcode(barcode: string): Promise<InventoryItemEntity | null> {
    await this.initialized.promise;

    try {
      const ormEntity = await this.repository!.findOne({
        where: { barcode },
      });

      if (!ormEntity) {
        return null;
      }

      // Convert to domain entity
      const domainEntity = this.ormToDomainEntitySafe(ormEntity);

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
    await this.initialized.promise;

    try {
      const count = await this.repository!.count({
        where: { typeId },
      });
      return count;
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
    await this.initialized.promise;

    try {
      const count = await this.repository!.count({
        where: { locationId },
      });
      return count;
    } catch (error) {
      this.logger.error('Error counting inventory items by location', {
        locationId,
        error,
      });
      throw error;
    }
  }
}

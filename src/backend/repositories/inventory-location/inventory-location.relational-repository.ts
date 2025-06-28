import { shouldRegister } from '../../services/should-register';
import { RELATIONAL_REPOSITORY_TEST_SET } from '../di-tokens';

import { InventoryLocationOrmEntity } from './relational-orm-entity';
import { InventoryLocationRepository } from './interface';
import { INVENTORY_LOCATION_REPOSITORY } from './di-tokens';

import { AbstractRelationalRepository } from '@/backend/repositories/abstract-relational-repository';
import type { RelationalDbService } from '@/backend/services/relationaldb.service';
import { InventoryLocationEntity } from '@/backend/entities/inventory-location.entity';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';
import { DatabaseType } from '@/backend/services/constants';
import {
	EVENTBUS_SERVICE,
	RELATIONALDB_SERVICE,
} from '@/backend/services/di-tokens';
import type { EventBusService } from '@/backend/services/eventbus.service';

/**
 * Relational database implementation of the InventoryLocation repository.
 * Handles CRUD operations for inventory locations in PostgreSQL/SQLite.
 */
@Service({
	name: INVENTORY_LOCATION_REPOSITORY,
	...shouldRegister([DatabaseType.SQLITE, DatabaseType.POSTGRES]),
	addToTestSet: [RELATIONAL_REPOSITORY_TEST_SET],
})
export class InventoryLocationRelationalRepository
	extends AbstractRelationalRepository<
		InventoryLocationOrmEntity,
		InventoryLocationEntity,
		[]
	>
	implements InventoryLocationRepository
{
	protected logger = new Logger('inventory-location-relational-repository');

	constructor(
		@Inject(RELATIONALDB_SERVICE) db: RelationalDbService,
		@Inject(EVENTBUS_SERVICE) protected eventBus: EventBusService,
	) {
		super({ db, ormEntityClass: InventoryLocationOrmEntity });
		this.eventBus = eventBus;
	}

	/**
	 * Converts a relational ORM entity to a domain InventoryLocationEntity (safe version).
	 */
	public ormToDomainEntitySafe(
		entity: InventoryLocationOrmEntity,
	): InventoryLocationEntity {
		return new InventoryLocationEntity({
			id: entity.id,
			name: entity.name,
			barcode: entity.barcode,
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
		});
	}

	/**
	 * Converts a domain InventoryLocationEntity to a relational ORM entity.
	 */
	public domainToOrmEntity(
		domainEntity: InventoryLocationEntity,
	): Omit<InventoryLocationOrmEntity, 'storeId'> {
		return {
			id: domainEntity.id,
			name: domainEntity.name,
			searchName: domainEntity.name.toLowerCase(),
			barcode: domainEntity.barcode,
			createdAt: domainEntity.createdAt,
			updatedAt: domainEntity.updatedAt,
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
		where?: { search?: string; barcode?: string; parent?: string };
		skip?: number;
		limit?: number;
		cursor?: string;
	}): Promise<InventoryLocationEntity[]> {
		await this.initialized.promise;

		const { where, skip, limit } = query;

		// Build query
		const queryBuilder = this.repository!.createQueryBuilder('location');

		// Apply filters
		if (where?.search) {
			const searchTerm = `%${where.search}%`;
			queryBuilder.andWhere(
				'(location.name ILIKE :search OR location.searchName ILIKE :search)',
				{ search: searchTerm },
			);
		}

		if (where?.barcode) {
			queryBuilder.andWhere('location.barcode = :barcode', {
				barcode: where.barcode,
			});
		}

		if (where?.parent) {
			queryBuilder.andWhere('location.parent = :parent', {
				parent: where.parent,
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
		queryBuilder.orderBy('location.createdAt', 'DESC');

		// Execute query
		const ormEntities = await queryBuilder.getMany();

		// Convert to domain entities
		return ormEntities.map((entity) => this.ormToDomainEntitySafe(entity));
	}

	/**
	 * Finds an inventory location by its barcode.
	 * @param barcode The barcode to search for
	 * @returns The inventory location or null if not found
	 */
	public async findByBarcode(
		barcode: string,
	): Promise<InventoryLocationEntity | null> {
		await this.initialized.promise;

		try {
			const ormEntity = await this.repository!.findOne({
				where: { barcode },
			});

			return ormEntity ? this.ormToDomainEntitySafe(ormEntity) : null;
		} catch (error) {
			this.logger.error('Error finding inventory location by barcode', {
				barcode,
				error,
			});
			throw error;
		}
	}
}

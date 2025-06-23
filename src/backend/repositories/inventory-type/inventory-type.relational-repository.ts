import { shouldRegister } from '../../services/should-register';
import { RELATIONAL_REPOSITORY_TEST_SET } from '../di-tokens';

import { InventoryTypeOrmEntity } from './relational-orm-entity';
import { InventoryTypeRepository } from './interface';
import { INVENTORY_TYPE_REPOSITORY } from './di-tokens';

import { AbstractRelationalRepository } from '@/backend/repositories/abstract-relational-repository';
import { RelationalDbService } from '@/backend/services/relationaldb.service';
import { InventoryTypeEntity } from '@/backend/entities/inventory-type.entity';
import { CustomJson } from '@/common/json';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';
import { DatabaseType } from '@/backend/services/constants';

/**
 * Relational database implementation of the InventoryType repository.
 * Handles CRUD operations for inventory types in PostgreSQL/SQLite.
 */
@Service({
	name: INVENTORY_TYPE_REPOSITORY,
	...shouldRegister([DatabaseType.SQLITE, DatabaseType.POSTGRES]),
	addToTestSet: [RELATIONAL_REPOSITORY_TEST_SET],
})
export class InventoryTypeRelationalRepository
	extends AbstractRelationalRepository<
		InventoryTypeOrmEntity,
		InventoryTypeEntity,
		[]
	>
	implements InventoryTypeRepository
{
	protected logger = new Logger('inventory-type-relational-repository');

	constructor(@Inject(RelationalDbService) db: RelationalDbService) {
		super({ db, ormEntityClass: InventoryTypeOrmEntity });
	}

	/**
	 * Converts a relational ORM entity to a domain InventoryTypeEntity (safe version).
	 */
	public ormToDomainEntitySafe(
		ormEntity: Omit<InventoryTypeOrmEntity, 'storeId'>,
	): InventoryTypeEntity {
		return new InventoryTypeEntity({
			id: ormEntity.id,
			name: ormEntity.name,
			checkInterval: ormEntity.checkInterval,
			checkType: ormEntity.checkType,
			properties: ormEntity.properties
				? CustomJson.fromJson(ormEntity.properties)
				: [],
			parent: ormEntity.parent,
			createdAt: ormEntity.createdAt,
			updatedAt: ormEntity.updatedAt,
		});
	}

	/**
	 * Converts a domain InventoryTypeEntity to a relational ORM entity.
	 */
	public domainToOrmEntity(
		domainEntity: InventoryTypeEntity,
	): Omit<InventoryTypeOrmEntity, 'storeId'> {
		return {
			id: domainEntity.id,
			name: domainEntity.name,
			searchName: domainEntity.name.toLowerCase(),
			checkInterval: domainEntity.checkInterval,
			checkType: domainEntity.checkType,
			properties: CustomJson.toJson(domainEntity.properties),
			parent: domainEntity.parent,
			createdAt: domainEntity.createdAt,
			updatedAt: domainEntity.updatedAt,
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
		await this.initialized.promise;

		const { where, skip, limit } = query;

		// Build query
		const queryBuilder = this.repository!.createQueryBuilder('type');

		// Apply filters
		if (where?.search) {
			// Ensure case-insensitive search by lowercasing the search term
			const searchTerm = `%${where.search.toLowerCase()}%`;
			queryBuilder.where('LOWER(type.searchName) LIKE :search', {
				search: searchTerm,
			});
		}

		if (where?.parent) {
			queryBuilder.andWhere('type.parent = :parent', { parent: where.parent });
		}

		if (where?.rootOnly) {
			queryBuilder.andWhere('type.parent IS NULL');
		}

		// Apply pagination
		if (skip) {
			queryBuilder.skip(skip);
		}

		if (limit) {
			queryBuilder.take(limit);
		}

		// Order by name
		queryBuilder.orderBy('type.name', 'ASC');

		// Execute query
		const ormEntities = await queryBuilder.getMany();

		// Convert to domain entities
		return ormEntities.map((entity) => this.ormToDomainEntitySafe(entity));
	}
}

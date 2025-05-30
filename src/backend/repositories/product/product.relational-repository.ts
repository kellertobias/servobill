import { Inject, Service } from '@/common/di';
import { PRODUCT_REPO_NAME, PRODUCT_REPOSITORY } from './di-tokens';
import { ProductEntity } from '@/backend/entities/product.entity';
import { ProductOrmEntity } from './relational-orm-entity';
import { Logger } from '@/backend/services/logger.service';
import { AbstractRelationalRepository } from '@/backend/repositories/abstract-relational-repository';
import { DatabaseType } from '@/backend/services/constants';
import { shouldRegister } from '../../services/should-register';
import { RelationalDbService } from '@/backend/services/relationaldb.service';
import type { ProductRepository } from './index';

/**
 * Unified repository for Product using TypeORM (Postgres or SQLite).
 * Handles mapping between ProductOrmEntity and ProductEntity.
 */
@Service({
	name: PRODUCT_REPOSITORY,
	...shouldRegister(DatabaseType.POSTGRES),
	...shouldRegister(DatabaseType.SQLITE),
})
export class ProductRelationalRepository
	extends AbstractRelationalRepository<ProductOrmEntity, ProductEntity, []>
	implements ProductRepository
{
	/** Logger instance for this repository. */
	protected logger = new Logger(PRODUCT_REPO_NAME);

	constructor(@Inject(RelationalDbService) db: RelationalDbService) {
		super({ db, ormEntityClass: ProductOrmEntity });
	}

	/**
	 * Converts a TypeORM ProductOrmEntity to a domain ProductEntity.
	 */
	protected ormToDomainEntitySafe(orm: ProductOrmEntity): ProductEntity {
		return new ProductEntity({
			id: orm.id,
			category: orm.category,
			name: orm.name,
			description: orm.description,
			notes: orm.notes,
			unit: orm.unit,
			priceCents: orm.priceCents,
			taxPercentage: orm.taxPercentage,
			expenses: (orm.expenses || []).map((e) => ({
				name: e.name ?? '',
				price: e.price ?? 0,
				categoryId: e.categoryId,
			})),
			createdAt: orm.createdAt,
			updatedAt: orm.updatedAt,
		});
	}

	/**
	 * Converts a domain ProductEntity to a TypeORM ProductOrmEntity.
	 */
	protected domainToOrmEntity(domain: ProductEntity): ProductOrmEntity {
		return {
			id: domain.id,
			category: domain.category,
			name: domain.name,
			description: domain.description,
			notes: domain.notes,
			unit: domain.unit,
			priceCents: domain.priceCents,
			taxPercentage: domain.taxPercentage,
			expenses: domain.expenses || [],
			createdAt: domain.createdAt,
			updatedAt: domain.updatedAt,
		};
	}

	/**
	 * Generates an empty ProductEntity with the given id.
	 */
	protected generateEmptyItem(id: string): ProductEntity {
		return new ProductEntity({
			id,
			name: '',
			category: 'default',
			priceCents: 0,
			taxPercentage: 0,
			createdAt: new Date(),
			updatedAt: new Date(),
			expenses: [],
		});
	}

	/**
	 * Lists products by query (search, skip, limit).
	 * @param query Query object with optional search, skip, limit, cursor
	 * @returns Array of ProductEntity
	 */
	public async listByQuery(query: {
		where?: { search?: string };
		skip?: number;
		limit?: number;
		cursor?: string;
	}): Promise<ProductEntity[]> {
		await this.initialized.promise;

		const qb = this.repository!.createQueryBuilder('product');
		if (query.where?.search) {
			qb.where('LOWER(product.name) LIKE :search', {
				search: `%${query.where.search.toLowerCase()}%`,
			});
		}
		if (query.skip) qb.skip(query.skip);
		if (query.limit) qb.take(query.limit);
		const results = await qb.getMany();
		return results.map((orm) => this.ormToDomainEntity(orm));
	}
}

import { shouldRegister } from '../../services/should-register';

import { CUSTOMER_REPOSITORY, CUSTOMER_REPO_NAME } from './di-tokens';
import { CustomerOrmEntity } from './relational-orm-entity';

import type { CustomerRepository } from './index';

import { Inject, Service } from '@/common/di';
import { CustomerEntity } from '@/backend/entities/customer.entity';
import { Logger } from '@/backend/services/logger.service';
import { AbstractRelationalRepository } from '@/backend/repositories/abstract-relational-repository';
import { DatabaseType } from '@/backend/services/constants';
import { RelationalDbService } from '@/backend/services/relationaldb.service';

/**
 * Unified repository for Customer using TypeORM (Postgres or SQLite).
 * Handles mapping between CustomerOrmEntity and CustomerEntity.
 */
@Service({
	name: CUSTOMER_REPOSITORY,
	...shouldRegister([DatabaseType.POSTGRES, DatabaseType.SQLITE]),
})
export class CustomerRelationalRepository
	extends AbstractRelationalRepository<CustomerOrmEntity, CustomerEntity, []>
	implements CustomerRepository
{
	/** Logger instance for this repository. */
	protected logger = new Logger(CUSTOMER_REPO_NAME);

	constructor(@Inject(RelationalDbService) db: RelationalDbService) {
		super({ db, ormEntityClass: CustomerOrmEntity });
	}

	/**
	 * Converts a TypeORM CustomerOrmEntity to a domain CustomerEntity.
	 */
	public ormToDomainEntitySafe(orm: CustomerOrmEntity): CustomerEntity {
		return new CustomerEntity({
			id: orm.id,
			customerNumber: orm.customerNumber,
			name: orm.name,
			contactName: orm.contactName,
			showContact: orm.showContact,
			email: orm.email,
			street: orm.street,
			zip: orm.zip,
			city: orm.city,
			state: orm.state,
			country: orm.country,
			notes: orm.notes,
			createdAt: orm.createdAt,
			updatedAt: orm.updatedAt,
		});
	}

	/**
	 * Converts a domain CustomerEntity to a TypeORM CustomerOrmEntity.
	 */
	public domainToOrmEntity(domain: CustomerEntity): CustomerOrmEntity {
		return {
			id: domain.id,
			customerNumber: domain.customerNumber,
			name: domain.name,
			searchName: domain.name.toLowerCase(),
			contactName: domain.contactName,
			showContact: domain.showContact,
			email: domain.email,
			street: domain.street,
			zip: domain.zip,
			city: domain.city,
			state: domain.state,
			country: domain.country,
			notes: domain.notes,
			createdAt: domain.createdAt,
			updatedAt: domain.updatedAt,
		};
	}

	/**
	 * Generates an empty CustomerEntity with the given id.
	 */
	protected generateEmptyItem(id: string): CustomerEntity {
		return new CustomerEntity({
			id,
			customerNumber: '',
			name: '',
			showContact: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}

	/**
	 * Lists customers by query (search, skip, limit).
	 * @param query Query object with optional search, skip, limit, cursor
	 * @returns Array of CustomerEntity
	 */
	public async listByQuery(query: {
		where?: { search?: string };
		skip?: number;
		limit?: number;
		cursor?: string;
	}): Promise<CustomerEntity[]> {
		const qb = this.repository!.createQueryBuilder('customer');
		if (query.where?.search) {
			qb.where('LOWER(customer.searchName) LIKE :search', {
				search: `%${query.where.search.toLowerCase()}%`,
			});
		}
		if (query.skip) {
			qb.skip(query.skip);
		}
		if (query.limit) {
			qb.take(query.limit);
		}
		const results = await qb.getMany();
		return results.map((orm) => this.ormToDomainEntitySafe(orm));
	}
}

import { CustomerEntity } from '@/backend/entities/customer.entity';
import type { CompanyDataSetting } from '@/backend/entities/settings.entity';
import { AbstractRelationalRepository } from '@/backend/repositories/abstract-relational-repository';
import { DatabaseType } from '@/backend/services/constants';
import { EVENTBUS_SERVICE, RELATIONALDB_SERVICE } from '@/backend/services/di-tokens';
import type { EventBusService } from '@/backend/services/eventbus.service';
import { Logger } from '@/backend/services/logger.service';
import type { RelationalDbService } from '@/backend/services/relationaldb.service';
import { Inject, Service } from '@/common/di';
import { shouldRegister } from '../../services/should-register';
import { RELATIONAL_REPOSITORY_TEST_SET } from '../di-tokens';
import { CUSTOMER_REPO_NAME, CUSTOMER_REPOSITORY } from './di-tokens';
import type { CustomerRepository } from './index';
import { CustomerOrmEntity } from './relational-orm-entity';

/**
 * Unified repository for Customer using TypeORM (Postgres or SQLite).
 * Handles mapping between CustomerOrmEntity and CustomerEntity.
 */
@Service({
  name: CUSTOMER_REPOSITORY,
  ...shouldRegister([DatabaseType.POSTGRES, DatabaseType.SQLITE]),
  addToTestSet: [RELATIONAL_REPOSITORY_TEST_SET],
})
export class CustomerRelationalRepository
  extends AbstractRelationalRepository<CustomerOrmEntity, CustomerEntity, []>
  implements CustomerRepository
{
  /** Logger instance for this repository. */
  protected logger = new Logger(CUSTOMER_REPO_NAME);

  constructor(
    @Inject(RELATIONALDB_SERVICE) db: RelationalDbService,
    @Inject(EVENTBUS_SERVICE) protected eventBus: EventBusService
  ) {
    super({ db, ormEntityClass: CustomerOrmEntity });
    this.eventBus = eventBus;
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
      countryCode: (orm.countryCode as CompanyDataSetting['companyData']['countryCode']) || 'DE',
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
      countryCode: domain.countryCode,
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
    await this.initialized.promise;

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

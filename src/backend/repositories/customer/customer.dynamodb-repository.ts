import type {
  IndexCompositeAttributes,
  QueryBranches,
  QueryOperations,
  ResponseItem,
} from 'electrodb';
import { CustomerEntity } from '@/backend/entities/customer.entity';
import { AbstractDynamodbRepository } from '@/backend/repositories/abstract-dynamodb-repository';
import { DatabaseType } from '@/backend/services/constants';
import { DYNAMODB_SERVICE, EVENTBUS_SERVICE } from '@/backend/services/di-tokens';
import type { DynamoDBService } from '@/backend/services/dynamodb.service';
import type { EventBusService } from '@/backend/services/eventbus.service';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';
import { shouldRegister } from '../../services/should-register';
import { DYNAMODB_REPOSITORY_TEST_SET } from '../di-tokens';
import { CUSTOMER_REPO_NAME, CUSTOMER_REPOSITORY } from './di-tokens';
import { type CustomerOrmEntity, entitySchema } from './dynamodb-orm-entity';
import type { CustomerRepository } from './index';

type CustomerSchema = typeof entitySchema.schema;
type CustomerSchemaResponseItem = ResponseItem<string, string, string, CustomerSchema>;

/**
 * DynamoDB implementation of the CustomerRepository interface.
 */
@Service({
  name: CUSTOMER_REPOSITORY,
  ...shouldRegister(DatabaseType.DYNAMODB),
  addToTestSet: [DYNAMODB_REPOSITORY_TEST_SET],
})
export class CustomerDynamodbRepository
  extends AbstractDynamodbRepository<
    CustomerOrmEntity,
    CustomerEntity,
    [],
    typeof entitySchema.schema
  >
  implements CustomerRepository
{
  protected logger = new Logger(CUSTOMER_REPO_NAME);
  protected mainIdName: string = 'customerId';
  protected storeId: string = 'customer';

  constructor(
    @Inject(DYNAMODB_SERVICE) private dynamoDb: DynamoDBService,
    @Inject(EVENTBUS_SERVICE) protected eventBus: EventBusService
  ) {
    super();
    this.eventBus = eventBus;
    this.store = this.dynamoDb.getEntity(entitySchema.schema);
  }

  /**
   * Converts a DynamoDB entity to a domain CustomerEntity.
   */
  public ormToDomainEntitySafe(entity: Omit<CustomerOrmEntity, 'storeId'>): CustomerEntity {
    return new CustomerEntity({
      id: entity.customerId,
      createdAt: new Date(entity.createdAt),
      updatedAt: new Date(entity.updatedAt),
      customerNumber: entity.customerNumber,
      name: entity.name,
      contactName: entity.contactName,
      showContact: entity.showContact,
      email: entity.email,
      street: entity.street,
      zip: entity.zip,
      city: entity.city,
      state: entity.state,
      countryCode: entity.countryCode as CustomerEntity['countryCode'],
      notes: entity.notes,
    });
  }

  /**
   * Converts a domain CustomerEntity to a DynamoDB entity.
   */
  public domainToOrmEntity(domainEntity: CustomerEntity): Omit<CustomerOrmEntity, 'storeId'> {
    return {
      customerId: domainEntity.id,
      showContact: domainEntity.showContact || false,
      customerNumber: domainEntity.customerNumber || '',
      name: domainEntity.name || '',
      contactName: domainEntity.contactName || '',
      email: domainEntity.email || '',
      street: domainEntity.street || '',
      zip: domainEntity.zip || '',
      city: domainEntity.city || '',
      state: domainEntity.state || '',
      countryCode: domainEntity.countryCode || '',
      notes: domainEntity.notes || '',
      searchName: domainEntity.name.toLowerCase(),
      createdAt: domainEntity.createdAt.toISOString(),
      updatedAt: domainEntity.updatedAt.toISOString(),
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
    const queryBuilder = this.store.query.byName({ storeId: this.storeId });

    let queryExecutor:
      | QueryBranches<
          string,
          string,
          string,
          CustomerSchema,
          CustomerSchemaResponseItem,
          IndexCompositeAttributes<string, string, string, CustomerSchema, 'byName'>
        >
      | QueryOperations<
          string,
          string,
          string,
          CustomerSchema,
          unknown,
          CustomerSchemaResponseItem,
          IndexCompositeAttributes<string, string, string, CustomerSchema, 'byName'>
        > = queryBuilder;
    if (query.where?.search) {
      queryExecutor = queryBuilder.begins({ searchName: query.where.search });
    }
    const data = await queryExecutor.go();
    return data.data.map((elm: CustomerOrmEntity) => this.ormToDomainEntity(elm));
  }
}

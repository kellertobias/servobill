import { EmailEntity } from '@/backend/entities/email.entity';
import { AbstractDynamodbRepository } from '@/backend/repositories/abstract-dynamodb-repository';
import { DatabaseType } from '@/backend/services/constants';
import { DYNAMODB_SERVICE, EVENTBUS_SERVICE } from '@/backend/services/di-tokens';
import type { DynamoDBService } from '@/backend/services/dynamodb.service';
import type { EventBusService } from '@/backend/services/eventbus.service';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';
import { shouldRegister } from '../../services/should-register';
import { DYNAMODB_REPOSITORY_TEST_SET } from '../di-tokens';
import { EMAIL_REPO_NAME, EMAIL_REPOSITORY } from './di-tokens';
import { type EmailOrmEntity, entitySchema } from './dynamodb-orm-entity';
import type { EmailRepository } from './index';

/**
 * DynamoDB implementation of the EmailRepository interface.
 */
@Service({
  name: EMAIL_REPOSITORY,
  ...shouldRegister(DatabaseType.DYNAMODB),
  addToTestSet: [DYNAMODB_REPOSITORY_TEST_SET],
})
export class EmailDynamodbRepository
  extends AbstractDynamodbRepository<EmailOrmEntity, EmailEntity, [], typeof entitySchema.schema>
  implements EmailRepository
{
  protected logger = new Logger(EMAIL_REPO_NAME);
  protected mainIdName: string = 'emailId';
  protected storeId: string = 'email';

  constructor(
    @Inject(DYNAMODB_SERVICE) private dynamoDb: DynamoDBService,
    @Inject(EVENTBUS_SERVICE) protected eventBus: EventBusService
  ) {
    super();
    this.eventBus = eventBus;
    this.store = this.dynamoDb.getEntity(entitySchema.schema);
  }

  /**
   * Converts a DynamoDB entity to a domain EmailEntity.
   */
  public ormToDomainEntitySafe(entity: Omit<EmailOrmEntity, 'storeId'>): EmailEntity {
    return new EmailEntity({
      id: entity.emailId,
      entityType: entity.entityType,
      entityId: entity.entityId,
      recipient: entity.recipient,
      sentAt: new Date(entity.sentAt),
    });
  }

  /**
   * Converts a domain EmailEntity to a DynamoDB entity.
   */
  public domainToOrmEntity(domainEntity: EmailEntity): Omit<EmailOrmEntity, 'storeId'> {
    return {
      emailId: domainEntity.id,
      entityType: domainEntity.entityType,
      entityId: domainEntity.entityId,
      recipient: domainEntity.recipient,
      sentAt: domainEntity.sentAt.toISOString(),
    };
  }

  /**
   * Generates an empty EmailEntity with the given id.
   */
  protected generateEmptyItem(id: string): EmailEntity {
    return new EmailEntity({
      id,
      entityType: '',
      entityId: '',
      recipient: '',
      sentAt: new Date(),
    });
  }

  /**
   * Lists emails by query (search, skip, limit).
   * Applies in-memory filtering for DynamoDB due to index limitations.
   * @param query Query object with optional search, skip, limit, cursor
   * @returns Array of EmailEntity
   */
  public async listByQuery(query: {
    where?: { search?: string };
    skip?: number;
    limit?: number;
    cursor?: string;
  }): Promise<EmailEntity[]> {
    const data = await this.store.query.byName({ storeId: this.storeId }).go();
    let results = data.data.map((elm: EmailOrmEntity) => this.ormToDomainEntity(elm));

    // In-memory filtering for search (recipient)
    if (query.where?.search) {
      const search = query.where.search.toLowerCase();
      results = results.filter((email: EmailEntity) =>
        email.recipient?.toLowerCase().includes(search)
      );
    }
    // Optionally, add skip/limit if needed
    if (query.skip) {
      results = results.slice(query.skip);
    }
    if (query.limit) {
      results = results.slice(0, query.limit);
    }
    return results;
  }
}

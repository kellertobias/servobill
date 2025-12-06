import { TimeBasedJobEntity } from '@/backend/entities/time-based-job.entity';
import { AbstractRelationalRepository } from '@/backend/repositories/abstract-relational-repository';
import { DatabaseType } from '@/backend/services/constants';
import { EVENTBUS_SERVICE, RELATIONALDB_SERVICE } from '@/backend/services/di-tokens';
import type { EventBusService } from '@/backend/services/eventbus.service';
import { Logger } from '@/backend/services/logger.service';
import type { RelationalDbService } from '@/backend/services/relationaldb.service';
import { shouldRegister } from '@/backend/services/should-register';
import { Inject, Service } from '@/common/di';
import { RELATIONAL_REPOSITORY_TEST_SET } from '../di-tokens';
import { TIME_BASED_JOB_REPOSITORY } from './di-tokens';
import type { TimeBasedJobCreateData, TimeBasedJobRepository } from './interface';
import { TimeBasedJobOrmEntity } from './relational-orm-entity';

/**
 * Relational (Postgres/SQLite) repository for time-based jobs.
 * Supports CRUD and efficient querying of due jobs (timestamp <= now).
 */
@Service({
  name: TIME_BASED_JOB_REPOSITORY,
  ...shouldRegister([DatabaseType.POSTGRES, DatabaseType.SQLITE]),
  addToTestSet: [RELATIONAL_REPOSITORY_TEST_SET],
})
export class TimeBasedJobRelationalRepository
  extends AbstractRelationalRepository<
    TimeBasedJobOrmEntity,
    TimeBasedJobEntity,
    [TimeBasedJobCreateData]
  >
  implements TimeBasedJobRepository
{
  protected logger = new Logger(TIME_BASED_JOB_REPOSITORY);

  constructor(
    @Inject(RELATIONALDB_SERVICE) db: RelationalDbService,
    @Inject(EVENTBUS_SERVICE) protected eventBus: EventBusService
  ) {
    super({ db, ormEntityClass: TimeBasedJobOrmEntity });
    this.eventBus = eventBus;
  }

  /**
   * Converts a TypeORM entity to a domain TimeBasedJobEntity.
   */
  public ormToDomainEntitySafe(entity: TimeBasedJobOrmEntity): TimeBasedJobEntity {
    return new TimeBasedJobEntity({
      id: entity.id,
      runAfter: Number(entity.runAfter),
      eventType: entity.eventType,
      eventPayload: JSON.parse(entity.eventPayload || '{}'),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  /**
   * Converts a domain TimeBasedJobEntity to a TypeORM entity.
   */
  public domainToOrmEntity(domainEntity: TimeBasedJobEntity): TimeBasedJobOrmEntity {
    return {
      id: domainEntity.id,
      runAfter: domainEntity.runAfter,
      eventType: domainEntity.eventType,
      eventPayload: JSON.stringify(domainEntity.eventPayload || {}),
      createdAt: domainEntity.createdAt,
      updatedAt: domainEntity.updatedAt,
    };
  }

  /**
   * Not used for time-based jobs, but required by AbstractRelationalRepository.
   */
  protected generateEmptyItem(id: string, data: TimeBasedJobCreateData): TimeBasedJobEntity {
    return new TimeBasedJobEntity({
      id,
      runAfter: data.runAfter,
      eventType: data.eventType,
      eventPayload: data.eventPayload as Record<string, unknown>,
    });
  }

  /**
   * Lists all jobs due at or before the given timestamp.
   * @param timestamp Upper bound (inclusive) for due jobs
   */
  public async listDueJobs(timestamp: number): Promise<TimeBasedJobEntity[]> {
    await this.initialized.promise;

    const qb = this.repository!.createQueryBuilder('jobQueue');
    qb.where('jobQueue.runAfter <= :timestamp', { timestamp });
    qb.orderBy('jobQueue.runAfter', 'ASC');

    const jobs = await qb.getMany();

    return jobs.map((orm) => this.ormToDomainEntitySafe(orm));
  }
}

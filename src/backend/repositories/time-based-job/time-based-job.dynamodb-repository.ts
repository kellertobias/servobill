import { DYNAMODB_REPOSITORY_TEST_SET } from '../di-tokens';

import { entitySchema, TimeBasedJobOrmEntity } from './dynamodb-orm-entity';
import { TIME_BASED_JOB_REPOSITORY } from './di-tokens';
import { TimeBasedJobCreateData, TimeBasedJobRepository } from './interface';

import { Inject, Service } from '@/common/di';
import { Logger } from '@/backend/services/logger.service';
import { AbstractDynamodbRepository } from '@/backend/repositories/abstract-dynamodb-repository';
import {
	DYNAMODB_SERVICE,
	EVENTBUS_SERVICE,
} from '@/backend/services/di-tokens';
import type { DynamoDBService } from '@/backend/services/dynamodb.service';
import type { EventBusService } from '@/backend/services/eventbus.service';
import { TimeBasedJobEntity } from '@/backend/entities/time-based-job.entity';
import { shouldRegister } from '@/backend/services/should-register';
import { DatabaseType } from '@/backend/services/constants';

/**
 * Repository for managing time-based jobs in DynamoDB.
 * Supports CRUD and efficient querying of due jobs (timestamp <= now).
 */
@Service({
	name: TIME_BASED_JOB_REPOSITORY,
	...shouldRegister(DatabaseType.DYNAMODB),
	addToTestSet: [DYNAMODB_REPOSITORY_TEST_SET],
})
export class TimeBasedJobDynamodbRepository
	extends AbstractDynamodbRepository<
		TimeBasedJobOrmEntity,
		TimeBasedJobEntity,
		[TimeBasedJobCreateData],
		typeof entitySchema.schema
	>
	implements TimeBasedJobRepository
{
	protected logger = new Logger(TIME_BASED_JOB_REPOSITORY);
	protected mainIdName: string = 'jobId';
	protected storeId: string = 'timeBasedJob';

	constructor(
		@Inject(DYNAMODB_SERVICE) private dynamoDb: DynamoDBService,
		@Inject(EVENTBUS_SERVICE) protected eventBus: EventBusService,
	) {
		super();
		this.eventBus = eventBus;
		this.store = this.dynamoDb.getEntity(entitySchema.schema);
	}

	/**
	 * Converts a DynamoDB entity to a domain TimeBasedJobEntity.
	 */
	public ormToDomainEntitySafe(
		entity: TimeBasedJobOrmEntity,
	): TimeBasedJobEntity {
		return new TimeBasedJobEntity({
			id: entity.jobId,
			runAfter: entity.runAfter,
			eventType: entity.eventType,
			eventPayload: JSON.parse(entity.eventPayload),
			createdAt: entity.createdAt ? new Date(entity.createdAt) : undefined,
			updatedAt: entity.updatedAt ? new Date(entity.updatedAt) : undefined,
		});
	}

	/**
	 * Converts a domain TimeBasedJobEntity to a DynamoDB entity.
	 */
	public domainToOrmEntity(
		domainEntity: TimeBasedJobEntity,
	): Omit<TimeBasedJobOrmEntity, 'storeId'> {
		return {
			jobId: domainEntity.id,
			runAfter: domainEntity.runAfter,
			eventType: domainEntity.eventType,
			eventPayload: JSON.stringify(domainEntity.eventPayload),
			createdAt: domainEntity.createdAt.toISOString(),
			updatedAt: domainEntity.updatedAt.toISOString(),
		};
	}

	/**
	 * Not used for time-based jobs, but required by AbstractDynamodbRepository.
	 */
	protected generateEmptyItem(
		id: string,
		data: TimeBasedJobCreateData,
	): TimeBasedJobEntity {
		// This method is required by the abstract class but not used for time-based jobs.
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
		// Query byYear GSI for jobs with runAfter <= given value
		// GSI: storeId (pk), runAfter (sk)
		const results = await this.store.query
			.byYear({ storeId: this.storeId })
			.lte({ runAfter: timestamp })
			.go();

		// ElectroDB returns results in 'data' property
		return results.data.map((item: TimeBasedJobOrmEntity) =>
			this.ormToDomainEntitySafe(item),
		);
	}
}

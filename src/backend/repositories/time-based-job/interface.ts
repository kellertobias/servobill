import type { TimeBasedJobEntity } from '@/backend/entities/time-based-job.entity';
import type { AbstractRepositoryInterface } from '../abstract-repository';

export type TimeBasedJobCreateData = {
	runAfter: number;
	eventType: string;
	eventPayload: unknown;
};

/**
 * Interface for all TimeBasedJob repositories (DynamoDB, etc).
 */
export type TimeBasedJobRepository = AbstractRepositoryInterface<
	TimeBasedJobEntity,
	[TimeBasedJobCreateData],
	{
		/**
		 * Lists all jobs due at or before the given timestamp.
		 * @param timestamp Upper bound (inclusive) for due jobs
		 */
		listDueJobs(timestamp: number): Promise<TimeBasedJobEntity[]>;
	}
>;

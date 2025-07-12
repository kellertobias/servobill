import { AbstractRepositoryInterface } from '../abstract-repository';

import { TimeBasedJobEntity } from '@/backend/entities/time-based-job.entity';

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

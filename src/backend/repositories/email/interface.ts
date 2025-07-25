import { AbstractRepositoryInterface } from '../abstract-repository';

import { EmailEntity } from '@/backend/entities/email.entity';

/**
 * Interface for all Email repositories (DynamoDB, Postgres, SQLite).
 */
export type EmailRepository = AbstractRepositoryInterface<
	EmailEntity,
	[],
	{
		listByQuery(query: {
			where?: { search?: string };
			skip?: number;
			limit?: number;
			cursor?: string;
		}): Promise<EmailEntity[]>;
	}
>;

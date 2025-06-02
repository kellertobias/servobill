import { AbstractRepositoryInterface } from '../abstract-repository';

import { CustomerEntity } from '@/backend/entities/customer.entity';

/**
 * Interface for all Customer repositories (DynamoDB, Postgres, SQLite).
 */
export type CustomerRepository = AbstractRepositoryInterface<
	CustomerEntity,
	[],
	{
		listByQuery(query: {
			where?: { search?: string };
			skip?: number;
			limit?: number;
			cursor?: string;
		}): Promise<CustomerEntity[]>;
	}
>;

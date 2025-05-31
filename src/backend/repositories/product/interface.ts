import { AbstractRepositoryInterface } from '../abstract-repository';

import { ProductEntity } from '@/backend/entities/product.entity';

/**
 * Interface for all Product repositories (DynamoDB, Postgres, SQLite).
 */
export type ProductRepository = AbstractRepositoryInterface<
	ProductEntity,
	[],
	{
		listByQuery(query: {
			where?: { search?: string };
			skip?: number;
			limit?: number;
			cursor?: string;
		}): Promise<ProductEntity[]>;
	}
>;

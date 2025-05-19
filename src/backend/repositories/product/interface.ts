import { ProductEntity } from '@/backend/entities/product.entity';
import { AbstractRepositoryInterface } from '../abstract-repository';

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

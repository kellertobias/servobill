import type { ProductEntity } from '@/backend/entities/product.entity';
import type { AbstractRepositoryInterface } from '../abstract-repository';

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

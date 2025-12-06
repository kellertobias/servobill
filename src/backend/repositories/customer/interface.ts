import type { CustomerEntity } from '@/backend/entities/customer.entity';
import type { AbstractRepositoryInterface } from '../abstract-repository';

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

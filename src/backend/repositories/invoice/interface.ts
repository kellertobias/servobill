import type { CustomerEntity } from '@/backend/entities/customer.entity';

import type { InvoiceEntity, InvoiceStatus, InvoiceType } from '@/backend/entities/invoice.entity';
import type { AbstractRepositoryInterface } from '../abstract-repository';

/**
 * Interface for all Invoice repositories (DynamoDB, Postgres, SQLite).
 */
export type InvoiceRepository = AbstractRepositoryInterface<
  InvoiceEntity,
  [InvoiceType, CustomerEntity, string],
  {
    listByQuery(query: {
      where?: { type?: InvoiceType; status?: InvoiceStatus; year?: number };
      skip?: number;
      limit?: number;
      cursor?: string;
    }): Promise<InvoiceEntity[]>;
  }
>;

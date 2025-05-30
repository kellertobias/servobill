import { AbstractRepositoryInterface } from '../abstract-repository';

import {
	InvoiceEntity,
	InvoiceType,
	InvoiceStatus,
} from '@/backend/entities/invoice.entity';
import { CustomerEntity } from '@/backend/entities/customer.entity';

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

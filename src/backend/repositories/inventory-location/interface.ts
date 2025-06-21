import { AbstractRepositoryInterface } from '../abstract-repository';

import { InventoryLocationEntity } from '@/backend/entities/inventory-location.entity';

/**
 * Interface for all InventoryLocation repositories (DynamoDB, Postgres, SQLite).
 */
export type InventoryLocationRepository = AbstractRepositoryInterface<
	InventoryLocationEntity,
	[],
	{
		listByQuery(query: {
			where?: { search?: string; barcode?: string };
			skip?: number;
			limit?: number;
			cursor?: string;
		}): Promise<InventoryLocationEntity[]>;
		findByBarcode(barcode: string): Promise<InventoryLocationEntity | null>;
	}
>;

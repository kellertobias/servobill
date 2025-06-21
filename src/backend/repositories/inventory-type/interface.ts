import { AbstractRepositoryInterface } from '../abstract-repository';

import { InventoryTypeEntity } from '@/backend/entities/inventory-type.entity';

/**
 * Interface for all InventoryType repositories (DynamoDB, Postgres, SQLite).
 */
export type InventoryTypeRepository = AbstractRepositoryInterface<
	InventoryTypeEntity,
	[],
	{
		listByQuery(query: {
			where?: {
				search?: string;
				parent?: string;
				rootOnly?: boolean;
			};
			skip?: number;
			limit?: number;
			cursor?: string;
		}): Promise<InventoryTypeEntity[]>;
	}
>;

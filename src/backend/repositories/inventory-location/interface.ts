import type { InventoryLocationEntity } from '@/backend/entities/inventory-location.entity';
import type { AbstractRepositoryInterface } from '../abstract-repository';

/**
 * Interface for all InventoryLocation repositories (DynamoDB, Postgres, SQLite).
 *
 * The `rootOnly` property in the `where` clause of `listByQuery` allows filtering for root locations (locations with no parent).
 */
export type InventoryLocationRepository = AbstractRepositoryInterface<
  InventoryLocationEntity,
  [],
  {
    listByQuery(query: {
      where?: {
        search?: string;
        barcode?: string;
        parent?: string;
        rootOnly?: boolean;
      };
      skip?: number;
      limit?: number;
      cursor?: string;
    }): Promise<InventoryLocationEntity[]>;
    findByBarcode(barcode: string): Promise<InventoryLocationEntity | null>;
  }
>;

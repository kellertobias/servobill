import type {
  InventoryItemEntity,
  InventoryItemState,
} from '@/backend/entities/inventory-item.entity';
import type { AbstractRepositoryInterface } from '../abstract-repository';

/**
 * Interface for all InventoryItem repositories (DynamoDB, Postgres, SQLite).
 * Supports both typed items (with typeId) and one-off items (without typeId).
 */
export type InventoryItemRepository = AbstractRepositoryInterface<
  InventoryItemEntity,
  [],
  {
    listByQuery(query: {
      where?: {
        typeId?: string | null;
        locationId?: string;
        state?: InventoryItemState;
        overdue?: boolean;
        search?: string;
        barcode?: string;
      };
      skip?: number;
      limit?: number;
      cursor?: string;
    }): Promise<InventoryItemEntity[]>;
    findByBarcode(barcode: string): Promise<InventoryItemEntity | null>;
    countByTypeId(typeId: string): Promise<number>;
    countByLocationId(locationId: string): Promise<number>;
  }
>;

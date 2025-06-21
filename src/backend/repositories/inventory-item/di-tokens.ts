/**
 * Dependency injection tokens for InventoryItem repository.
 */
export const INVENTORY_ITEM_REPOSITORY = Symbol('INVENTORY_ITEM_REPOSITORY');

/**
 * Type for the InventoryItem repository token.
 */
export type InventoryItemRepositoryToken = typeof INVENTORY_ITEM_REPOSITORY;

/**
 * Dependency injection tokens for InventoryLocation repository.
 */
export const INVENTORY_LOCATION_REPOSITORY = Symbol(
	'INVENTORY_LOCATION_REPOSITORY',
);

/**
 * Type for the InventoryLocation repository token.
 */
export type InventoryLocationRepositoryToken =
	typeof INVENTORY_LOCATION_REPOSITORY;

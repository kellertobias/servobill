import { randomUUID } from 'crypto';

import {
	Arg,
	Mutation,
	Query,
	Resolver,
	Int,
	Authorized,
	FieldResolver,
	Root,
} from 'type-graphql';

import { GRAPHQL_TEST_SET } from '../di-tokens';

import {
	InventoryLocation,
	CreateInventoryLocationInput,
	UpdateInventoryLocationInput,
	InventoryLocationWhereInput,
} from './inventory-location.schema';
import { InventoryItem } from './inventory-item.schema';
import { InventoryResolver } from './inventory-item.resolver';

import { INVENTORY_LOCATION_REPOSITORY } from '@/backend/repositories/inventory-location';
import { type InventoryLocationRepository } from '@/backend/repositories/inventory-location';
import { INVENTORY_ITEM_REPOSITORY } from '@/backend/repositories/inventory-item';
import { type InventoryItemRepository } from '@/backend/repositories/inventory-item';
import { InventoryLocationEntity } from '@/backend/entities/inventory-location.entity';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';

/**
 * GraphQL resolver for inventory location operations.
 * Provides CRUD operations and querying capabilities for inventory locations.
 */
@Service({
	addToTestSet: [GRAPHQL_TEST_SET],
})
@Resolver(() => InventoryLocation)
export class InventoryLocationResolver {
	private logger = new Logger('inventory-location-resolver');

	constructor(
		@Inject(INVENTORY_LOCATION_REPOSITORY)
		private inventoryLocationRepository: InventoryLocationRepository,

		@Inject(INVENTORY_ITEM_REPOSITORY)
		private inventoryItemRepository: InventoryItemRepository,

		@Inject(InventoryResolver)
		private inventoryResolver: InventoryResolver,
	) {}

	/**
	 * Retrieves a single inventory location by its ID.
	 * @param id The unique identifier of the inventory location
	 * @returns The inventory location or null if not found
	 */
	@Authorized()
	@Query(() => InventoryLocation, { nullable: true })
	async inventoryLocation(
		@Arg('id', () => String) id: string,
	): Promise<InventoryLocation | null> {
		try {
			const location = await this.inventoryLocationRepository.getById(id);
			return location ? this.mapToGraphQL(location) : null;
		} catch (error) {
			this.logger.error('Error fetching inventory location by id', {
				id,
				error,
			});
			throw error;
		}
	}

	/**
	 * Retrieves a single inventory location by its barcode.
	 * @param barcode The barcode of the inventory location
	 * @returns The inventory location or null if not found
	 */
	@Authorized()
	@Query(() => InventoryLocation, { nullable: true })
	async inventoryLocationByBarcode(
		@Arg('barcode', () => String) barcode: string,
	): Promise<InventoryLocation | null> {
		try {
			const location =
				await this.inventoryLocationRepository.findByBarcode(barcode);
			return location ? this.mapToGraphQL(location) : null;
		} catch (error) {
			this.logger.error('Error fetching inventory location by barcode', {
				barcode,
				error,
			});
			throw error;
		}
	}

	/**
	 * Lists inventory locations with optional filtering and pagination.
	 * @param where Optional filters for the query
	 * @param skip Number of items to skip for pagination
	 * @param limit Maximum number of items to return
	 * @returns Array of inventory locations
	 */
	@Authorized()
	@Query(() => [InventoryLocation])
	async inventoryLocations(
		@Arg('where', () => InventoryLocationWhereInput, { nullable: true })
		where?: InventoryLocationWhereInput,
		@Arg('skip', () => Int, { nullable: true }) skip?: number,
		@Arg('limit', () => Int, { nullable: true }) limit?: number,
	): Promise<InventoryLocation[]> {
		try {
			const locations = await this.inventoryLocationRepository.listByQuery({
				where: where
					? {
							search: where.search,
							barcode: where.barcode,
						}
					: undefined,
				skip,
				limit,
			});

			return locations.map((location) => this.mapToGraphQL(location));
		} catch (error) {
			this.logger.error('Error fetching inventory locations', {
				where,
				skip,
				limit,
				error,
			});
			throw error;
		}
	}

	/**
	 * Creates a new inventory location.
	 * @param input The inventory location data
	 * @returns The newly created inventory location
	 */
	@Authorized()
	@Mutation(() => InventoryLocation)
	async createInventoryLocation(
		@Arg('input', () => CreateInventoryLocationInput)
		input: CreateInventoryLocationInput,
	): Promise<InventoryLocation> {
		try {
			const location = new InventoryLocationEntity({
				id: randomUUID(),
				name: input.name,
				barcode: input.barcode,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await this.inventoryLocationRepository.save(location);
			return this.mapToGraphQL(location);
		} catch (error) {
			this.logger.error('Error creating inventory location', { input, error });
			throw error;
		}
	}

	/**
	 * Updates an existing inventory location.
	 * @param id The unique identifier of the inventory location to update
	 * @param input The updated inventory location data
	 * @returns The updated inventory location
	 */
	@Authorized()
	@Mutation(() => InventoryLocation)
	async updateInventoryLocation(
		@Arg('id', () => String) id: string,
		@Arg('input', () => UpdateInventoryLocationInput)
		input: UpdateInventoryLocationInput,
	): Promise<InventoryLocation> {
		try {
			const existingLocation =
				await this.inventoryLocationRepository.getById(id);
			if (!existingLocation) {
				throw new Error(`Inventory location with id ${id} not found`);
			}

			// Update the location with new values
			if (input.name !== undefined) {
				existingLocation.updateName(input.name);
			}
			if (input.barcode !== undefined) {
				existingLocation.updateBarcode(input.barcode);
			}

			await this.inventoryLocationRepository.save(existingLocation);
			return this.mapToGraphQL(existingLocation);
		} catch (error) {
			this.logger.error('Error updating inventory location', {
				id,
				input,
				error,
			});
			throw error;
		}
	}

	/**
	 * Deletes an inventory location.
	 * @param id The unique identifier of the inventory location to delete
	 * @returns True if the location was successfully deleted
	 */
	@Authorized()
	@Mutation(() => Boolean)
	async deleteInventoryLocation(
		@Arg('id', () => String) id: string,
	): Promise<boolean> {
		try {
			const existingLocation =
				await this.inventoryLocationRepository.getById(id);
			if (!existingLocation) {
				throw new Error(`Inventory location with id ${id} not found`);
			}

			await this.inventoryLocationRepository.delete(id);
			return true;
		} catch (error) {
			this.logger.error('Error deleting inventory location', { id, error });
			throw error;
		}
	}

	/**
	 * Field resolver for items - resolves all items for this location when requested.
	 * @param location The inventory location to resolve items for
	 * @returns Array of inventory items at this location
	 */
	@Authorized()
	@FieldResolver(() => [InventoryItem], { nullable: true })
	async items(
		@Root() location: InventoryLocation,
	): Promise<InventoryItem[] | undefined> {
		try {
			const items = await this.inventoryItemRepository.listByQuery({
				where: { locationId: location.id },
			});

			const locationEntity = await this.inventoryLocationRepository.getById(
				location.id,
			);
			if (!locationEntity) {
				this.logger.warn('Location entity not found for field resolver', {
					locationId: location.id,
				});
				return [];
			}

			return Promise.all(
				items.map((item) =>
					this.inventoryResolver.mapToGraphQL(item, {
						location: locationEntity,
					}),
				),
			);
		} catch (error) {
			this.logger.error('Error resolving items for inventory location', {
				locationId: location.id,
				error,
			});
			return [];
		}
	}

	/**
	 * Field resolver for itemCount - resolves the count of items at this location when requested.
	 * This provides an efficient way to get the count without loading all item details.
	 * @param location The inventory location to resolve count for
	 * @returns The number of items at this location
	 */
	@Authorized()
	@FieldResolver(() => Number, { nullable: true })
	async itemCount(
		@Root() location: InventoryLocation,
	): Promise<number | undefined> {
		try {
			// Use the countByLocationId method for better performance when only the count is needed
			const count = await this.inventoryItemRepository.countByLocationId(
				location.id,
			);
			return count;
		} catch (error) {
			this.logger.error('Error resolving item count for inventory location', {
				locationId: location.id,
				error,
			});
			return 0;
		}
	}

	/**
	 * Field resolver for children - resolves all child locations of this inventory location.
	 * @param location The inventory location to resolve children for
	 * @returns Array of child inventory locations
	 */
	@Authorized()
	@FieldResolver(() => [InventoryLocation], { nullable: true })
	async children(
		@Root() location: InventoryLocation,
	): Promise<InventoryLocation[] | undefined> {
		try {
			const children = await this.inventoryLocationRepository.listByQuery({
				where: { parent: location.id },
			});
			return children.map((child) => this.mapToGraphQL(child));
		} catch (error) {
			this.logger.error('Error resolving children for inventory location', {
				locationId: location.id,
				error,
			});
			return [];
		}
	}

	/**
	 * Maps a domain InventoryLocationEntity to a GraphQL InventoryLocation.
	 * @param entity The domain entity to map
	 * @returns The GraphQL representation
	 */
	private mapToGraphQL(entity: InventoryLocationEntity): InventoryLocation {
		return {
			id: entity.id,
			name: entity.name,
			barcode: entity.barcode,
			items: undefined, // Will be resolved by field resolver if requested
			itemCount: undefined, // Will be resolved by field resolver if requested
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
		};
	}
}

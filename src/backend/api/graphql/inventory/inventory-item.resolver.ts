import {
	Arg,
	Authorized,
	FieldResolver,
	Int,
	Mutation,
	Query,
	Resolver,
	Root,
} from 'type-graphql';
import {
	InventoryCheckState,
	type InventoryItemEntity,
} from '@/backend/entities/inventory-item.entity';
import { INVENTORY_ITEM_REPOSITORY } from '@/backend/repositories/inventory-item/di-tokens';
import type { InventoryItemRepository } from '@/backend/repositories/inventory-item/interface';
import { INVENTORY_LOCATION_REPOSITORY } from '@/backend/repositories/inventory-location/di-tokens';
import type { InventoryLocationRepository } from '@/backend/repositories/inventory-location/interface';
import { INVENTORY_TYPE_REPOSITORY } from '@/backend/repositories/inventory-type/di-tokens';
import type { InventoryTypeRepository } from '@/backend/repositories/inventory-type/interface';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';
import { GRAPHQL_TEST_SET } from '../di-tokens';
import {
	InventoryItem,
	InventoryItemInput,
	InventoryItemWhereInput,
} from './inventory-item.schema';
import { InventoryLocation } from './inventory-location.schema';
import { InventoryType } from './inventory-type.schema';

/**
 * GraphQL resolver for inventory item operations.
 * Provides CRUD operations and querying capabilities for inventory items.
 */
@Service({
	addToTestSet: [GRAPHQL_TEST_SET],
})
@Resolver(() => InventoryItem)
export class InventoryResolver {
	private logger = new Logger('inventory-item-resolver');

	constructor(
		@Inject(INVENTORY_ITEM_REPOSITORY)
		private inventoryItemRepository: InventoryItemRepository,

		@Inject(INVENTORY_LOCATION_REPOSITORY)
		private inventoryLocationRepository: InventoryLocationRepository,

		@Inject(INVENTORY_TYPE_REPOSITORY)
		private inventoryTypeRepository: InventoryTypeRepository,
	) {}

	/**
	 * Retrieves a single inventory item by its ID.
	 * @param id The unique identifier of the inventory item
	 * @returns The inventory item or null if not found
	 */
	@Authorized()
	@Query(() => InventoryItem, { nullable: true })
	async inventoryItem(
		@Arg('id', () => String, { nullable: true }) id?: string,
		@Arg('barcode', () => String, { nullable: true }) barcode?: string,
	): Promise<InventoryItem | null> {
		try {
			let item: InventoryItemEntity | null = null;
			if (id) {
				item = await this.inventoryItemRepository.getById(id);
			} else if (barcode) {
				item = await this.inventoryItemRepository.findByBarcode(barcode);
				if (item) {
					const lastLastScanned = item.lastScanned;
					item.lastScanned = new Date();
					await this.inventoryItemRepository.save(item);

					// set it back for returning the last scanned date
					item.lastScanned = lastLastScanned;
				}
			}

			if (!item) {
				return null;
			}

			return this.mapToGraphQL(item);
		} catch (error) {
			this.logger.error('Error fetching inventory item', { id, error });
			throw error;
		}
	}

	/**
	 * Lists inventory items based on query parameters.
	 * Supports filtering by type, location, state, overdue status, and search terms.
	 * @param where Optional filtering criteria
	 * @param skip Number of items to skip for pagination
	 * @param limit Maximum number of items to return
	 * @returns Array of inventory items matching the criteria
	 */
	@Authorized()
	@Query(() => [InventoryItem])
	async inventoryItems(
		// needs to at least support typeId, locationId, search, overdue
		@Arg('where', () => InventoryItemWhereInput, { nullable: true })
		where?: InventoryItemWhereInput,
		@Arg('skip', () => Int, { nullable: true }) skip?: number,
		@Arg('limit', () => Int, { nullable: true }) limit?: number,
	): Promise<InventoryItem[]> {
		try {
			const items = await this.inventoryItemRepository.listByQuery({
				where,
				skip,
				limit,
			});

			// Map items to GraphQL format - need to await each mapping since it's async
			const mappedItems = await Promise.all(
				items.map((item) => this.mapToGraphQL(item)),
			);
			return mappedItems;
		} catch (error) {
			this.logger.error('Error fetching inventory items', { where, error });
			throw error;
		}
	}

	/**
	 * Creates a new inventory item.
	 * @param input The inventory item data
	 * @returns The newly created inventory item
	 */
	@Authorized()
	@Mutation(() => InventoryItem)
	async createInventoryItem(
		@Arg('data', () => InventoryItemInput) data: InventoryItemInput,
	): Promise<InventoryItem> {
		try {
			// check type and location for existence
			if (data.typeId) {
				const type = await this.inventoryTypeRepository.getById(data.typeId);
				if (!type) {
					throw new Error(`Inventory type with id ${data.typeId} not found`);
				}
			}
			if (data.locationId) {
				const location = await this.inventoryLocationRepository.getById(
					data.locationId,
				);
				if (!location) {
					throw new Error(
						`Inventory location with id ${data.locationId} not found`,
					);
				}
			}

			const item = await this.inventoryItemRepository.create();
			if (data.name) {
				item.updateName(data.name);
			}
			if (data.barcode) {
				item.updateBarcode(data.barcode);
			}
			if (data.locationId) {
				item.updateLocation(data.locationId, 'Created from GraphQL');
			}
			if (data.typeId) {
				item.updateTypeId(data.typeId);
			}
			if (data.state) {
				item.updateState(data.state);
			}
			item.updateProperties(
				data.properties?.map((prop) => [prop.key, prop.value]) || [],
			);

			item.history = [];

			await this.inventoryItemRepository.save(item);
			return this.mapToGraphQL(item);
		} catch (error) {
			this.logger.error('Error creating inventory item', { data, error });
			throw error;
		}
	}

	/**
	 * Updates an existing inventory item.
	 * @param id The unique identifier of the inventory item to update
	 * @param input The updated inventory item data
	 * @returns The updated inventory item
	 */
	@Authorized()
	@Mutation(() => InventoryItem)
	async updateInventoryItem(
		@Arg('id', () => String) id: string,
		// we can update: name, barcode, location, type, properties, state
		@Arg('data', () => InventoryItemInput) data: InventoryItemInput,
	): Promise<InventoryItem> {
		try {
			const existingItem = await this.inventoryItemRepository.getById(id);
			if (!existingItem) {
				throw new Error(`Inventory item with id ${id} not found`);
			}

			// Update fields
			if (data.name !== undefined) {
				existingItem.updateName(data.name);
			}
			if (data.barcode !== undefined) {
				existingItem.updateBarcode(data.barcode);
			}
			if (data.locationId !== undefined) {
				// check location for existence
				const location = await this.inventoryLocationRepository.getById(
					data.locationId,
				);
				if (!location) {
					throw new Error(
						`Inventory location with id ${data.locationId} not found`,
					);
				}
				const oldLocation = await this.inventoryLocationRepository.getById(
					existingItem.locationId,
				);
				const note = `Location changed from ${oldLocation?.name} to ${location.name}`;
				existingItem.updateLocation(data.locationId, note);
			}
			if (data.typeId !== undefined) {
				// check type for existence
				const type = await this.inventoryTypeRepository.getById(data.typeId);
				if (!type) {
					throw new Error(`Inventory type with id ${data.typeId} not found`);
				}
				existingItem.updateTypeId(data.typeId);
			}
			if (data.state !== undefined) {
				existingItem.updateState(data.state);
			}

			if (data.properties !== undefined) {
				existingItem.updateProperties(
					data.properties.map(({ key, value }) => [key, value]),
				);
			}
			await this.inventoryItemRepository.save(existingItem);
			return this.mapToGraphQL(existingItem);
		} catch (error) {
			this.logger.error('Error updating inventory item', { id, data, error });
			throw error;
		}
	}

	/**
	 * Adds a check entry to an inventory item's history.
	 * @param id The unique identifier of the inventory item
	 * @param state The result of the check
	 * @param note Optional note about the check
	 * @returns true if the check was successfully added
	 */
	@Authorized()
	@Mutation(() => Boolean)
	async addInventoryCheck(
		@Arg('id', () => String) id: string,
		@Arg('state', () => InventoryCheckState) state: InventoryCheckState,
		@Arg('note', () => String, { nullable: true }) note?: string,
	): Promise<boolean> {
		try {
			const existingItem = await this.inventoryItemRepository.getById(id);
			if (!existingItem) {
				throw new Error(`Inventory item with id ${id} not found`);
			}

			existingItem.addCheck(state, note);
			await this.inventoryItemRepository.save(existingItem);
			return true;
		} catch (error) {
			this.logger.error('Error adding inventory check', {
				id,
				state,
				note,
				error,
			});
			throw error;
		}
	}

	/**
	 * Adds a note to an inventory item's history.
	 * @param id The unique identifier of the inventory item
	 * @param note The note to add
	 * @returns true if the note was successfully added
	 */
	@Authorized()
	@Mutation(() => Boolean)
	async addInventoryNote(
		@Arg('id', () => String) id: string,
		@Arg('note', () => String) note: string,
	): Promise<boolean> {
		try {
			const existingItem = await this.inventoryItemRepository.getById(id);
			if (!existingItem) {
				throw new Error(`Inventory item with id ${id} not found`);
			}

			existingItem.addNote(note);
			await this.inventoryItemRepository.save(existingItem);
			return true;
		} catch (error) {
			this.logger.error('Error adding inventory note', { id, note, error });
			throw error;
		}
	}

	/**
	 * Deletes an inventory item.
	 * @param id The unique identifier of the inventory item to delete
	 * @returns true if the item was successfully deleted
	 */
	@Authorized()
	@Mutation(() => Boolean)
	async deleteInventoryItem(
		@Arg('id', () => String) id: string,
	): Promise<boolean> {
		try {
			const existingItem = await this.inventoryItemRepository.getById(id);
			if (!existingItem) {
				return false;
			}

			await this.inventoryItemRepository.delete(id);
			return true;
		} catch (error) {
			this.logger.error('Error deleting inventory item', { id, error });
			throw error;
		}
	}

	/**
	 * Maps a domain InventoryItemEntity to a GraphQL InventoryItem.
	 * @param entity The domain entity to map
	 * @returns The GraphQL representation
	 */
	@Authorized()
	public async mapToGraphQL(
		entity: InventoryItemEntity,
	): Promise<InventoryItem> {
		return {
			id: entity.id,
			name: entity.name,
			barcode: entity.barcode,
			state: entity.state,
			properties: entity.properties.map(([key, value]) => ({
				key,
				value,
			})),
			nextCheck: entity.nextCheck,
			lastScanned: entity.lastScanned,
			history: entity.history.map((entry) => ({
				type: entry.type,
				state: entry.state,
				date: entry.date,
				note: entry.note,
			})),
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
			typeId: entity.typeId,
			locationId: entity.locationId,
		};
	}

	/**
	 * Field resolver for the type/category of an inventory item.
	 * Resolves the full InventoryType, including its properties.
	 */
	@Authorized()
	@FieldResolver(() => InventoryType, { nullable: true })
	async type(@Root() item: InventoryItem): Promise<InventoryType | undefined> {
		if (!item || !item.id || !item.typeId) {
			return undefined;
		}
		const type = await this.inventoryTypeRepository.getById(item.typeId);
		if (!type) {
			return undefined;
		}
		// Map to GraphQL InventoryType
		return {
			id: type.id,
			name: type.name,
			checkInterval: type.checkInterval,
			checkType: type.checkType,
			properties: type.properties,
			parent: type.parent ?? undefined,
			itemCount: 0,
			createdAt: type.createdAt,
			updatedAt: type.updatedAt,
		};
	}

	/**
	 * Field resolver for the location of an inventory item.
	 * Resolves the full InventoryLocation.
	 */
	@Authorized()
	@FieldResolver(() => InventoryLocation, { nullable: true })
	async location(
		@Root() item: InventoryItem,
	): Promise<InventoryLocation | undefined> {
		if (!item || !item.id || !item.locationId) {
			return undefined;
		}
		const location = await this.inventoryLocationRepository.getById(
			item.locationId,
		);
		if (!location) {
			return undefined;
		}
		// Map to GraphQL InventoryLocation
		return {
			id: location.id,
			name: location.name,
			barcode: location.barcode,
			parent: location.parent ?? undefined,
			itemCount: 0,
			createdAt: location.createdAt,
			updatedAt: location.updatedAt,
		};
	}
}

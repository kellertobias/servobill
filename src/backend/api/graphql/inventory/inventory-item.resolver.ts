import { randomUUID } from 'crypto';

import { Arg, Mutation, Query, Resolver, Int, Authorized } from 'type-graphql';

import {
	InventoryItem,
	InventoryItemInput,
	InventoryItemWhereInput,
} from './inventory-item.schema';

import { INVENTORY_ITEM_REPOSITORY } from '@/backend/repositories/inventory-item/di-tokens';
import { type InventoryItemRepository } from '@/backend/repositories/inventory-item/interface';
import {
	InventoryItemEntity,
	InventoryItemState,
	InventoryCheckState,
} from '@/backend/entities/inventory-item.entity';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';
import { type InventoryLocationRepository } from '@/backend/repositories/inventory-location/interface';
import { INVENTORY_LOCATION_REPOSITORY } from '@/backend/repositories/inventory-location/di-tokens';
import { INVENTORY_TYPE_REPOSITORY } from '@/backend/repositories/inventory-type/di-tokens';
import { type InventoryTypeRepository } from '@/backend/repositories/inventory-type/interface';
import { InventoryLocationEntity } from '@/backend/entities/inventory-location.entity';
import { InventoryTypeEntity } from '@/backend/entities/inventory-type.entity';

/**
 * GraphQL resolver for inventory item operations.
 * Provides CRUD operations and querying capabilities for inventory items.
 */
@Service()
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
		@Arg('input', () => InventoryItemInput) input: InventoryItemInput,
	): Promise<InventoryItem> {
		try {
			// check type and location for existence
			if (input.typeId) {
				const type = await this.inventoryTypeRepository.getById(input.typeId);
				if (!type) {
					throw new Error(`Inventory type with id ${input.typeId} not found`);
				}
			}
			if (input.locationId) {
				const location = await this.inventoryLocationRepository.getById(
					input.locationId,
				);
				if (!location) {
					throw new Error(
						`Inventory location with id ${input.locationId} not found`,
					);
				}
			}

			const item = new InventoryItemEntity({
				id: randomUUID(),
				typeId: input.typeId,
				name: input.name,
				barcode: input.barcode,
				locationId: input.locationId,
				state: input.state || InventoryItemState.NEW,
				properties:
					input.properties?.map((prop) => [prop.key, prop.value]) || [],
				nextCheck: input.nextCheck || new Date(),
				lastScanned: new Date(),
				history: [],
			});

			await this.inventoryItemRepository.save(item);
			return this.mapToGraphQL(item);
		} catch (error) {
			this.logger.error('Error creating inventory item', { input, error });
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
		@Arg('input', () => InventoryItemInput) input: InventoryItemInput,
	): Promise<InventoryItem> {
		try {
			const existingItem = await this.inventoryItemRepository.getById(id);
			if (!existingItem) {
				throw new Error(`Inventory item with id ${id} not found`);
			}

			// Update fields
			if (input.name !== undefined) {
				existingItem.updateName(input.name);
			}
			if (input.barcode !== undefined) {
				existingItem.updateBarcode(input.barcode);
			}
			if (input.locationId !== undefined) {
				// check location for existence
				const location = await this.inventoryLocationRepository.getById(
					input.locationId,
				);
				if (!location) {
					throw new Error(
						`Inventory location with id ${input.locationId} not found`,
					);
				}
				existingItem.updateLocation(input.locationId);
			}
			if (input.typeId !== undefined) {
				// check type for existence
				const type = await this.inventoryTypeRepository.getById(input.typeId);
				if (!type) {
					throw new Error(`Inventory type with id ${input.typeId} not found`);
				}
				existingItem.updateTypeId(input.typeId);
			}
			if (input.state !== undefined) {
				// if state changes, add a history entry
				if (existingItem.state !== input.state) {
					existingItem.addNote(
						`State changed from ${existingItem.state} to ${input.state}`,
					);
				}
				existingItem.updateState(input.state);
			}

			if (input.properties !== undefined) {
				existingItem.updateProperties(
					input.properties.map(({ key, value }) => [key, value]),
				);
			}
			await this.inventoryItemRepository.save(existingItem);
			return this.mapToGraphQL(existingItem);
		} catch (error) {
			this.logger.error('Error updating inventory item', { id, input, error });
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

	// eslint-disable-next-line type-graphql/require-authorized-decorator
	public async mapToGraphQL(
		entity: InventoryItemEntity,
		extras?: {
			location?: Pick<InventoryLocationEntity, 'id' | 'name'>;
			type?: Pick<
				InventoryTypeEntity,
				'id' | 'name' | 'checkInterval' | 'checkType'
			>;
		},
	): Promise<InventoryItem> {
		const location =
			extras?.location ||
			(entity.locationId
				? await this.inventoryLocationRepository.getById(entity.locationId)
				: null);
		const type =
			extras?.type ||
			(entity.typeId
				? await this.inventoryTypeRepository.getById(entity.typeId)
				: null);

		return {
			id: entity.id,
			type: type
				? {
						id: type.id,
						name: type.name,
						checkInterval: type.checkInterval,
						checkType: type.checkType,
					}
				: undefined,
			location: location
				? {
						id: location.id,
						name: location.name,
					}
				: undefined,
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
		};
	}
}

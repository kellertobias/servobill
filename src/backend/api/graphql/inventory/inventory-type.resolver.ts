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
	InventoryType,
	CreateInventoryTypeInput,
	UpdateInventoryTypeInput,
	InventoryTypeWhereInput,
} from './inventory-type.schema';
import { InventoryItem } from './inventory-item.schema';
import { InventoryResolver } from './inventory-item.resolver';

import { INVENTORY_TYPE_REPOSITORY } from '@/backend/repositories/inventory-type/di-tokens';
import { type InventoryTypeRepository } from '@/backend/repositories/inventory-type/interface';
import { INVENTORY_ITEM_REPOSITORY } from '@/backend/repositories/inventory-item/di-tokens';
import { type InventoryItemRepository } from '@/backend/repositories/inventory-item/interface';
import { InventoryTypeEntity } from '@/backend/entities/inventory-type.entity';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';

/**
 * GraphQL resolver for inventory type operations.
 * Provides CRUD operations and querying capabilities for inventory types.
 */
@Service({
	addToTestSet: [GRAPHQL_TEST_SET],
})
@Resolver(() => InventoryType)
export class InventoryTypeResolver {
	private logger = new Logger('inventory-type-resolver');

	constructor(
		@Inject(INVENTORY_TYPE_REPOSITORY)
		private inventoryTypeRepository: InventoryTypeRepository,

		@Inject(INVENTORY_ITEM_REPOSITORY)
		private inventoryItemRepository: InventoryItemRepository,

		@Inject(InventoryResolver)
		private inventoryResolver: InventoryResolver,
	) {}

	/**
	 * Retrieves a single inventory type by its ID.
	 * @param id The unique identifier of the inventory type
	 * @returns The inventory type or null if not found
	 */
	@Authorized()
	@Query(() => InventoryType, { nullable: true })
	async inventoryType(
		@Arg('id', () => String, { nullable: true }) id: string | null,
	): Promise<InventoryType | null> {
		if (!id) {
			return null;
		}
		try {
			const type = await this.inventoryTypeRepository.getById(id);
			return type ? this.mapToGraphQL(type) : null;
		} catch (error) {
			this.logger.error('Error fetching inventory type by id', { id, error });
			throw error;
		}
	}

	/**
	 * Lists inventory types with optional filtering and pagination.
	 * @param where Optional filters for the query
	 * @param skip Number of items to skip for pagination
	 * @param limit Maximum number of items to return
	 * @returns Array of inventory types
	 */
	@Authorized()
	@Query(() => [InventoryType])
	async inventoryTypes(
		@Arg('where', () => InventoryTypeWhereInput, { nullable: true })
		where?: InventoryTypeWhereInput,
		@Arg('skip', () => Int, { nullable: true }) skip?: number,
		@Arg('limit', () => Int, { nullable: true }) limit?: number,
	): Promise<InventoryType[]> {
		try {
			// Build query filter, supporting rootOnly
			let queryWhere: Partial<InventoryTypeWhereInput> | undefined = undefined; // Use Partial for flexible filter
			if (where) {
				if (where.rootOnly) {
					// rootOnly: true means only types with no parent
					queryWhere = { ...where, rootOnly: true };
					delete queryWhere.parent; // ensure parent is not set
				} else {
					queryWhere = {
						search: where.search,
						parent: where.parent,
					};
				}
			}
			const types = await this.inventoryTypeRepository.listByQuery({
				where: queryWhere,
				skip,
				limit,
			});

			return types.map((type) => this.mapToGraphQL(type));
		} catch (error) {
			this.logger.error('Error fetching inventory types', {
				where,
				skip,
				limit,
				error,
			});
			throw error;
		}
	}

	/**
	 * Creates a new inventory type.
	 * @param input The inventory type data
	 * @returns The newly created inventory type
	 */
	@Authorized()
	@Mutation(() => InventoryType)
	async createInventoryType(
		@Arg('input', () => CreateInventoryTypeInput)
		input: CreateInventoryTypeInput,
	): Promise<InventoryType> {
		try {
			// Validate parent exists if provided
			if (input.parent) {
				const parentType = await this.inventoryTypeRepository.getById(
					input.parent,
				);
				if (!parentType) {
					throw new Error(
						`Parent inventory type with id ${input.parent} not found`,
					);
				}
			}

			const type = new InventoryTypeEntity({
				id: randomUUID(),
				name: input.name,
				checkInterval: input.checkInterval,
				checkType: input.checkType,
				properties: input.properties || [],
				parent: input.parent,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await this.inventoryTypeRepository.save(type);
			return this.mapToGraphQL(type);
		} catch (error) {
			this.logger.error('Error creating inventory type', { input, error });
			throw error;
		}
	}

	/**
	 * Updates an existing inventory type.
	 * @param id The unique identifier of the inventory type to update
	 * @param input The updated inventory type data
	 * @returns The updated inventory type
	 */
	@Authorized()
	@Mutation(() => InventoryType)
	async updateInventoryType(
		@Arg('id', () => String) id: string,
		@Arg('input', () => UpdateInventoryTypeInput)
		input: UpdateInventoryTypeInput,
	): Promise<InventoryType> {
		try {
			const existingType = await this.inventoryTypeRepository.getById(id);
			if (!existingType) {
				throw new Error(`Inventory type with id ${id} not found`);
			}

			// Validate parent exists if provided
			if (input.parent) {
				const parentType = await this.inventoryTypeRepository.getById(
					input.parent,
				);
				if (!parentType) {
					throw new Error(
						`Parent inventory type with id ${input.parent} not found`,
					);
				}
			}

			// Update the type with new values using entity methods
			if (input.name !== undefined) {
				existingType.updateName(input.name);
			}
			if (input.checkInterval !== undefined) {
				existingType.updateCheckInterval(input.checkInterval);
			}
			if (input.checkType !== undefined) {
				existingType.updateCheckType(input.checkType);
			}
			if (input.properties !== undefined) {
				existingType.updateProperties(input.properties);
			}
			if (input.parent !== undefined) {
				if (input.parent) {
					existingType.updateParent(input.parent);
				} else {
					existingType.removeParent();
				}
			}

			await this.inventoryTypeRepository.save(existingType);
			return this.mapToGraphQL(existingType);
		} catch (error) {
			this.logger.error('Error updating inventory type', { id, input, error });
			throw error;
		}
	}

	/**
	 * Deletes an inventory type. Fails if any items still exist in this type.
	 * @param id The unique identifier of the inventory type to delete
	 * @returns True if the type was successfully deleted
	 */
	@Authorized()
	@Mutation(() => Boolean)
	async deleteInventoryType(
		@Arg('id', () => String) id: string,
	): Promise<boolean> {
		try {
			const existingType = await this.inventoryTypeRepository.getById(id);
			if (!existingType) {
				throw new Error(`Inventory type with id ${id} not found`);
			}

			// Check if any items exist with this type
			const itemCount = await this.inventoryItemRepository.countByTypeId(id);
			if (itemCount > 0) {
				throw new Error(
					`Cannot delete inventory type with id ${id} because ${itemCount} items still exist with this type. Please remove or reassign all items first.`,
				);
			}

			await this.inventoryTypeRepository.delete(id);
			return true;
		} catch (error) {
			this.logger.error('Error deleting inventory type', { id, error });
			throw error;
		}
	}

	/**
	 * Field resolver for items - resolves all items with this type when requested.
	 * @param type The inventory type to resolve items for
	 * @returns Array of inventory items of this type
	 */
	@Authorized()
	@FieldResolver(() => [InventoryItem], { nullable: true })
	async items(
		@Root() type: InventoryType,
	): Promise<InventoryItem[] | undefined> {
		try {
			const items = await this.inventoryItemRepository.listByQuery({
				where: { typeId: type.id },
			});

			return Promise.all(
				items.map((item) =>
					this.inventoryResolver.mapToGraphQL(item, {
						type,
					}),
				),
			);
		} catch (error) {
			this.logger.error('Error resolving items for inventory type', {
				typeId: type.id,
				error,
			});
			return [];
		}
	}

	/**
	 * Field resolver for itemCount - counts the amount of items of this type.
	 * @param type The inventory type to count items for
	 * @returns The number of items of this type
	 */
	@Authorized()
	@FieldResolver(() => Int)
	async itemCount(@Root() type: InventoryType): Promise<number> {
		try {
			return await this.inventoryItemRepository.countByTypeId(type.id);
		} catch (error) {
			this.logger.error('Error counting items for inventory type', {
				typeId: type.id,
				error,
			});
			return 0;
		}
	}

	/**
	 * Field resolver for children - resolves all child types of this inventory type.
	 * @param type The inventory type to resolve children for
	 * @returns Array of child inventory types
	 */
	@Authorized()
	@FieldResolver(() => [InventoryType], { nullable: true })
	async children(
		@Root() type: InventoryType,
	): Promise<InventoryType[] | undefined> {
		try {
			const children = await this.inventoryTypeRepository.listByQuery({
				where: { parent: type.id },
			});
			return children.map((child) => this.mapToGraphQL(child));
		} catch (error) {
			this.logger.error('Error resolving children for inventory type', {
				typeId: type.id,
				error,
			});
			return [];
		}
	}

	/**
	 * Field resolver for parentName - resolves the name of the parent inventory type, if any.
	 * This allows clients to easily display hierarchical relationships without extra queries.
	 * @param type The inventory type to resolve the parent name for
	 * @returns The name of the parent inventory type, or undefined if no parent
	 */
	@Authorized()
	@FieldResolver(() => String, { nullable: true })
	async parentName(@Root() type: InventoryType): Promise<string | undefined> {
		if (!type.parent) {
			return undefined;
		}
		const parent = await this.inventoryTypeRepository.getById(type.parent);
		return parent?.name;
	}

	/**
	 * Maps a domain InventoryTypeEntity to the GraphQL type, ensuring parent is undefined for root nodes.
	 */
	private mapToGraphQL(entity: InventoryTypeEntity): InventoryType {
		return {
			id: entity.id,
			name: entity.name,
			checkInterval: entity.checkInterval,
			checkType: entity.checkType,
			properties: entity.properties,
			parent: entity.parent ?? undefined,
			items: undefined,
			itemCount: 0,
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
		};
	}
}

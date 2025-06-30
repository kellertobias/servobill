import { Field, ObjectType, InputType } from 'type-graphql';
import { IsOptional, IsString, MaxLength } from 'class-validator';

import { InventoryItem } from './inventory-item.schema';

/**
 * GraphQL type for inventory location
 */
@ObjectType('InventoryLocation')
export class InventoryLocation {
	@Field(() => String)
	id!: string;

	@Field(() => String)
	name!: string;

	@Field(() => String, { nullable: true })
	barcode?: string;

	@Field(() => String, { nullable: true })
	/**
	 * The ID of the parent inventory location, if any.
	 */
	parent?: string;

	@Field(() => String, { nullable: true })
	/**
	 * The name of the parent inventory location, if any. Resolved via a field resolver for convenience in the UI.
	 */
	parentName?: string;

	@Field(() => [InventoryLocation], { nullable: true })
	children?: InventoryLocation[];

	@Field(() => [InventoryItem], { nullable: true })
	items?: InventoryItem[];

	@Field(() => Number, { nullable: true })
	itemCount?: number;

	@Field(() => Date)
	createdAt!: Date;

	@Field(() => Date)
	updatedAt!: Date;
}

/**
 * Input type for creating a new inventory location
 */
@InputType('InventoryLocationInput')
export class InventoryLocationInput {
	@Field(() => String)
	@IsString()
	@MaxLength(255)
	name!: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	barcode?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	/**
	 * Optional parent location ID. If provided, sets the parent of this location on creation.
	 */
	parent?: string;
}

/**
 * Input type for filtering inventory locations
 */
@InputType('InventoryLocationWhereInput')
export class InventoryLocationWhereInput {
	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	search?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	barcode?: string;

	/**
	 * Optional parent location ID to filter locations by their parent.
	 * If provided, only locations with this parent ID will be returned.
	 */
	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	parent?: string;

	/**
	 * If true, only locations without a parent (root locations) will be returned.
	 * This is mutually exclusive with the 'parent' filter.
	 */
	@Field(() => Boolean, { nullable: true })
	@IsOptional()
	rootOnly?: boolean;
}

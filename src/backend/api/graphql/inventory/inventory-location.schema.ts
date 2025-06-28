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
	parent?: string;

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
@InputType('CreateInventoryLocationInput')
export class CreateInventoryLocationInput {
	@Field(() => String)
	@IsString()
	@MaxLength(255)
	name!: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	barcode?: string;
}

/**
 * Input type for updating an existing inventory location
 */
@InputType('UpdateInventoryLocationInput')
export class UpdateInventoryLocationInput {
	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	@MaxLength(255)
	name?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	barcode?: string;
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
}

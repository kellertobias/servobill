import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { Field, InputType, Int, ObjectType } from 'type-graphql';

import { InventoryItem } from './inventory-item.schema';

/**
 * GraphQL type for inventory type
 */
@ObjectType('InventoryType')
export class InventoryType {
	@Field(() => String)
	id!: string;

	@Field(() => String)
	name!: string;

	@Field(() => Int, { nullable: true })
	checkInterval?: number;

	@Field(() => String, { nullable: true })
	checkType?: string;

	@Field(() => [String])
	properties!: string[];

	@Field(() => String, { nullable: true })
	/**
	 * The ID of the parent inventory type, if any.
	 */
	parent?: string;

	@Field(() => String, { nullable: true })
	/**
	 * The name of the parent inventory type, if any. Resolved via a field resolver for convenience in the UI.
	 */
	parentName?: string;

	@Field(() => [InventoryType], { nullable: true })
	children?: InventoryType[];

	@Field(() => [InventoryItem], { nullable: true })
	items?: InventoryItem[];

	@Field(() => Int)
	itemCount!: number;

	@Field(() => Date)
	createdAt!: Date;

	@Field(() => Date)
	updatedAt!: Date;
}

/**
 * Input type for creating a new inventory type
 */
@InputType('InventoryTypeInput')
export class InventoryTypeInput {
	@Field(() => String)
	@IsString()
	@MaxLength(255)
	name!: string;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	checkInterval?: number;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	checkType?: string;

	@Field(() => [String], { nullable: true })
	@IsOptional()
	properties?: string[];

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	parent?: string;
}

/**
 * Input type for filtering inventory types
 */
@InputType('InventoryTypeWhereInput')
export class InventoryTypeWhereInput {
	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	search?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	parent?: string;

	@Field(() => Boolean, { nullable: true })
	@IsOptional()
	rootOnly?: boolean;
}

import { Field, ObjectType, InputType, Int } from 'type-graphql';
import { IsOptional, IsString, IsNumber, MaxLength } from 'class-validator';

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
	parent?: string;

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
@InputType('CreateInventoryTypeInput')
export class CreateInventoryTypeInput {
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
 * Input type for updating an existing inventory type
 */
@InputType('UpdateInventoryTypeInput')
export class UpdateInventoryTypeInput {
	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	@MaxLength(255)
	name?: string;

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

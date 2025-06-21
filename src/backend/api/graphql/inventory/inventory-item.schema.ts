import { Field, ObjectType, InputType, Int } from 'type-graphql';
import {
	IsOptional,
	IsString,
	IsUUID,
	IsDate,
	IsArray,
	IsEnum,
	IsBoolean,
	MaxLength,
} from 'class-validator';

import {
	InventoryItemState,
	InventoryCheckState,
	InventoryHistoryType,
} from '@/backend/entities/inventory-item.entity';

/**
 * GraphQL type for inventory item properties
 */
@ObjectType('InventoryItemProperty')
export class InventoryItemProperty {
	@Field(() => String)
	key!: string;

	@Field(() => String)
	value!: string;
}

/**
 * GraphQL type for inventory item history entries
 */
@ObjectType('InventoryItemHistory')
export class InventoryItemHistory {
	@Field(() => InventoryHistoryType)
	type!: InventoryHistoryType;

	@Field(() => InventoryCheckState, { nullable: true })
	state?: InventoryCheckState;

	@Field(() => Date)
	date!: Date;

	@Field(() => String, { nullable: true })
	note?: string;
}

/**
 * GraphQL type for inventory type information
 */
@ObjectType('InventoryTypeInfo')
export class InventoryTypeInfo {
	@Field(() => String)
	id!: string;

	@Field(() => String)
	name!: string;

	@Field(() => Int, { nullable: true })
	checkInterval?: number;

	@Field(() => String, { nullable: true })
	checkType?: string;
}

/**
 * GraphQL type for inventory location information
 */
@ObjectType('InventoryLocationInfo')
export class InventoryLocationInfo {
	@Field(() => String)
	id!: string;

	@Field(() => String)
	name!: string;
}

/**
 * Main GraphQL type for inventory items
 */
@ObjectType('InventoryItem')
export class InventoryItem {
	@Field(() => String)
	id!: string;

	@Field(() => InventoryTypeInfo, { nullable: true })
	type?: InventoryTypeInfo;

	@Field(() => InventoryLocationInfo, { nullable: true })
	location?: InventoryLocationInfo;

	@Field(() => String, { nullable: true })
	name?: string;

	@Field(() => String, { nullable: true })
	barcode?: string;

	@Field(() => InventoryItemState)
	state!: InventoryItemState;

	@Field(() => [InventoryItemProperty])
	properties!: InventoryItemProperty[];

	@Field(() => Date)
	nextCheck!: Date;

	@Field(() => Date)
	lastScanned!: Date;

	@Field(() => [InventoryItemHistory])
	history!: InventoryItemHistory[];

	@Field(() => Date)
	createdAt!: Date;

	@Field(() => Date)
	updatedAt!: Date;
}

/**
 * Input type for inventory item properties
 */
@InputType('InventoryItemPropertyInput')
export class InventoryItemPropertyInput {
	@IsString()
	@MaxLength(255)
	@Field(() => String)
	key!: string;

	@IsString()
	@MaxLength(1000)
	@Field(() => String)
	value!: string;
}

/**
 * Input type for creating/updating inventory items
 */
@InputType('InventoryItemInput')
export class InventoryItemInput {
	@IsOptional()
	@IsUUID()
	@Field(() => String, { nullable: true })
	typeId?: string;

	@IsOptional()
	@IsString()
	@MaxLength(255)
	@Field(() => String, { nullable: true })
	name?: string;

	@IsOptional()
	@IsString()
	@MaxLength(255)
	@Field(() => String, { nullable: true })
	barcode?: string;

	@IsOptional()
	@IsUUID()
	@Field(() => String, { nullable: true })
	locationId?: string;

	@IsOptional()
	@IsEnum(InventoryItemState)
	@Field(() => InventoryItemState, { nullable: true })
	state?: InventoryItemState;

	@IsOptional()
	@IsArray()
	@Field(() => [InventoryItemPropertyInput], { nullable: true })
	properties?: InventoryItemPropertyInput[];

	@IsOptional()
	@IsDate()
	@Field(() => Date, { nullable: true })
	nextCheck?: Date;
}

/**
 * Input type for filtering inventory items
 */
@InputType('InventoryItemWhereInput')
export class InventoryItemWhereInput {
	@IsOptional()
	@IsUUID()
	@Field(() => String, { nullable: true })
	typeId?: string;

	@IsOptional()
	@IsUUID()
	@Field(() => String, { nullable: true })
	locationId?: string;

	@IsOptional()
	@IsEnum(InventoryItemState)
	@Field(() => InventoryItemState, { nullable: true })
	state?: InventoryItemState;

	@IsOptional()
	@IsBoolean()
	@Field(() => Boolean, { nullable: true })
	overdue?: boolean;

	@IsOptional()
	@IsString()
	@MaxLength(255)
	@Field(() => String, { nullable: true })
	search?: string;

	@IsOptional()
	@IsString()
	@MaxLength(255)
	@Field(() => String, { nullable: true })
	barcode?: string;
}

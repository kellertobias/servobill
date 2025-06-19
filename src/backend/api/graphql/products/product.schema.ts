import { IsOptional, IsString } from 'class-validator';
import { Field, ObjectType, InputType, Int } from 'type-graphql';

import type { FilteredObjectProperties } from '../types';

import type { ProductEntity } from '@/backend/entities/product.entity';

/**
 * Represents an expense associated with a product (for output).
 */
@ObjectType('ProductExpense')
export class ProductExpense {
	@Field(() => String)
	name!: string;

	@Field(() => Int)
	price!: number;

	@Field(() => String, { nullable: true })
	categoryId?: string;
}

/**
 * Represents an expense associated with a product (for input).
 */
@InputType('ProductExpenseInput')
export class ProductExpenseInput {
	@Field(() => String)
	name!: string;

	@Field(() => Int)
	price!: number;

	@Field(() => String, { nullable: true })
	categoryId?: string;
}

@ObjectType('Product')
export class Product implements FilteredObjectProperties<ProductEntity> {
	@Field(() => String)
	id!: string;

	@Field(() => String)
	category!: string;

	@Field(() => String)
	name!: string;

	@Field(() => String, { nullable: true })
	description?: string;

	@Field(() => String, { nullable: true })
	notes?: string;

	@Field(() => String, { nullable: true })
	unit?: string;

	@Field(() => Int)
	priceCents!: number;

	@Field(() => Int)
	taxPercentage!: number;

	@Field(() => [ProductExpense], { nullable: true })
	expenses?: ProductExpense[];

	@Field(() => Date)
	createdAt!: Date;

	@Field(() => Date)
	updatedAt!: Date;
}

@InputType('ProductInput')
export class ProductInput
	implements Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
{
	@IsString()
	@Field(() => String)
	name!: string;

	@Field(() => String)
	category!: string;

	@Field(() => String, { nullable: true })
	description?: string;

	@Field(() => String, { nullable: true })
	notes?: string;

	@Field(() => Int)
	priceCents!: number;

	@Field(() => Int)
	taxPercentage!: number;

	@Field(() => [ProductExpenseInput], { nullable: true })
	expenses?: ProductExpenseInput[];
}

@InputType('ProductWhereInput')
export class ProductWhereInput {
	@IsOptional()
	@Field(() => String, { nullable: true })
	search?: string;

	@IsOptional()
	@Field(() => String, { nullable: true })
	category?: string;
}

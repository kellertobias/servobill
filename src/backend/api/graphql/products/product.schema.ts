import { IsOptional, IsString } from 'class-validator';
import { Field, ObjectType, InputType, Int } from 'type-graphql';

import type { FilteredObjectProperties } from '../types';

import type { ProductEntity } from '@/backend/entities/product.entity';

/**
 * Represents an expense associated with a product (for output).
 */
@ObjectType()
export class ProductExpense {
	@Field()
	name!: string;

	@Field(() => Int)
	price!: number;

	@Field({ nullable: true })
	categoryId?: string;
}

/**
 * Represents an expense associated with a product (for input).
 */
@InputType()
export class ProductExpenseInput {
	@Field()
	name!: string;

	@Field(() => Int)
	price!: number;

	@Field({ nullable: true })
	categoryId?: string;
}

@ObjectType()
export class Product implements FilteredObjectProperties<ProductEntity> {
	@Field()
	id!: string;

	@Field()
	category!: string;

	@Field()
	name!: string;

	@Field({ nullable: true })
	description?: string;

	@Field({ nullable: true })
	notes?: string;

	@Field({ nullable: true })
	unit?: string;

	@Field(() => Int)
	priceCents!: number;

	@Field(() => Int)
	taxPercentage!: number;

	@Field(() => [ProductExpense], { nullable: true })
	expenses?: ProductExpense[];

	@Field()
	createdAt!: Date;

	@Field()
	updatedAt!: Date;
}

@InputType()
export class ProductInput
	implements Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
{
	@IsString()
	@Field()
	name!: string;

	@Field()
	category!: string;

	@Field({ nullable: true })
	description?: string;

	@Field({ nullable: true })
	notes?: string;

	@Field(() => Int)
	priceCents!: number;

	@Field(() => Int)
	taxPercentage!: number;

	@Field(() => [ProductExpenseInput], { nullable: true })
	expenses?: ProductExpenseInput[];
}

@InputType()
export class ProductWhereInput {
	@IsOptional()
	@Field({ nullable: true })
	search?: string;

	@IsOptional()
	@Field({ nullable: true })
	category?: string;
}

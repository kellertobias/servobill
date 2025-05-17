import { IsOptional, IsString } from 'class-validator';
import { Field, ObjectType, InputType, Int } from 'type-graphql';

import type { FilteredObjectProperties } from '../types';

import type { ProductEntity } from '@/backend/entities/product.entity';

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

	@Field(() => Int, {
		nullable: true,
		description:
			'The expense in cents associated with this product (optional).',
	})
	expenseCents?: number;

	@Field(() => Int, {
		nullable: true,
		description: 'A multiplicator for the expense (optional, defaults to 1).',
	})
	expenseMultiplicator?: number;

	/**
	 * The expense category ID associated with this product (optional).
	 */
	@Field({
		nullable: true,
		description: 'The expense category ID for auto-created expenses.',
	})
	expenseCategoryId?: string;

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

	@Field(() => Int, {
		nullable: true,
		description:
			'The expense in cents associated with this product (optional).',
	})
	expenseCents?: number;

	@Field(() => Int, {
		nullable: true,
		description: 'A multiplicator for the expense (optional, defaults to 1).',
	})
	expenseMultiplicator?: number;

	@Field({
		nullable: true,
		description: 'The expense category ID for auto-created expenses.',
	})
	expenseCategoryId?: string;
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

import { IsOptional, IsString } from 'class-validator';
import { Field, ObjectType, InputType, Int } from 'type-graphql';

import { FilteredObjectProperties } from '../types';

import { ProductEntity } from '@/backend/entities/product.entity';

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

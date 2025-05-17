import { IsInt, IsOptional, IsString } from 'class-validator';
import { Field, ObjectType, InputType, Int } from 'type-graphql';

import { FilteredObjectProperties } from '../types';

import { ExpenseEntity } from '@/backend/entities/expense.entity';

@ObjectType()
export class Expense implements FilteredObjectProperties<ExpenseEntity> {
	@Field()
	id!: string;

	@Field()
	name!: string;

	@Field({ nullable: true })
	description?: string;

	@Field({ nullable: true })
	notes?: string;

	@Field(() => Int)
	expendedCents!: number;

	@Field(() => Int, { nullable: true })
	taxCents?: number;

	@Field()
	expendedAt!: Date;

	@Field({
		nullable: true,
		description: 'The ID of the expense category assigned to this expense.',
	})
	categoryId?: string;

	@Field()
	createdAt!: Date;

	@Field()
	updatedAt!: Date;
}

@InputType()
export class ExpenseInput
	implements Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>
{
	@IsString()
	@Field()
	name!: string;

	@Field({ nullable: true })
	description?: string;

	@Field({ nullable: true })
	notes?: string;

	@IsInt()
	@Field(() => Int)
	expendedCents!: number;

	@IsOptional()
	@IsInt()
	@Field(() => Int, { nullable: true })
	taxCents?: number;

	@Field()
	expendedAt!: Date;

	@Field({
		nullable: true,
		description: 'The ID of the expense category assigned to this expense.',
	})
	categoryId?: string;
}

@InputType()
export class ExpenseWhereInput {
	@Field({ nullable: true })
	search?: string;

	@Field(() => Int, { nullable: true })
	year?: number;
}

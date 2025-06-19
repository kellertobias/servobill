import { IsInt, IsOptional, IsString } from 'class-validator';
import { Field, ObjectType, InputType, Int } from 'type-graphql';

import { FilteredObjectProperties } from '../types';
import { ExpenseCategoryType } from '../system/system.schema';
import { Attachment } from '../attachments/attachment.schema';

import { ExpenseEntity } from '@/backend/entities/expense.entity';

@ObjectType('Expense')
export class Expense implements FilteredObjectProperties<ExpenseEntity> {
	@Field(() => String)
	id!: string;

	@Field(() => String)
	name!: string;

	@Field(() => String, { nullable: true })
	description?: string;

	@Field(() => String, { nullable: true })
	notes?: string;

	@Field(() => Int)
	expendedCents!: number;

	@Field(() => Int, { nullable: true })
	taxCents?: number;

	@Field(() => Date)
	expendedAt!: Date;

	/**
	 * The ID of the expense category assigned to this expense.
	 */
	@Field(() => String, {
		nullable: true,
		description: 'The ID of the expense category assigned to this expense.',
	})
	categoryId?: string;

	/**
	 * The full category object assigned to this expense (if requested).
	 */
	@Field(() => ExpenseCategoryType, {
		nullable: true,
		description: 'The full category object assigned to this expense.',
	})
	category?: ExpenseCategoryType;

	@Field(() => Date)
	createdAt!: Date;

	@Field(() => Date)
	updatedAt!: Date;

	/**
	 * List of attachments linked to this expense.
	 */
	@Field(() => [Attachment], { nullable: true })
	attachments?: Attachment[];
}

@InputType('ExpenseInput')
export class ExpenseInput
	implements Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>
{
	@IsString()
	@Field(() => String)
	name!: string;

	@Field(() => String, { nullable: true })
	description?: string;

	@Field(() => String, { nullable: true })
	notes?: string;

	@IsInt()
	@Field(() => Int)
	expendedCents!: number;

	@IsOptional()
	@IsInt()
	@Field(() => Int, { nullable: true })
	taxCents?: number;

	@Field(() => Date)
	expendedAt!: Date;

	@Field(() => String, {
		nullable: true,
		description: 'The ID of the expense category assigned to this expense.',
	})
	categoryId?: string;

	/**
	 * List of attachment IDs to link to this expense.
	 */
	@Field(() => [String], { nullable: true })
	attachmentIds?: string[];
}

@InputType('ExpenseWhereInput')
export class ExpenseWhereInput {
	@Field(() => String, { nullable: true })
	search?: string;

	@Field(() => Int, { nullable: true })
	year?: number;
}

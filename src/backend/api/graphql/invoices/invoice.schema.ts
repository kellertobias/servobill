import { Field, ObjectType, Int, Float, InputType } from 'type-graphql';
import {
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsPositive,
	IsString,
	IsUUID,
	MaxLength,
} from 'class-validator';

import { Customer, CustomerInput } from '../customers/customers.schema';
import { FilteredObjectProperties } from '../types';

import {
	InvoiceEntity,
	InvoiceStatus,
	InvoiceType,
} from '@/backend/entities/invoice.entity';
import {
	InvoiceSubmissionEntity,
	InvoiceSubmissionType,
} from '@/backend/entities/invoice-submission.entity';
import {
	InvoiceActivityEntity,
	InvoiceActivityType,
} from '@/backend/entities/invoice-activity.entity';
import { ObjectProperties } from '@/common/ts-helpers';
import { InvoiceItemEntity } from '@/backend/entities/invoice-item.entity';

@InputType()
export class InvoiceItemExpenseInput {
	@Field()
	name!: string;

	@Field(() => Int)
	price!: number;

	@Field({ nullable: true })
	categoryId?: string;

	@Field(() => Boolean)
	enabled!: boolean;
}

@ObjectType()
export class InvoiceItemExpense {
	@Field()
	name!: string;

	@Field(() => Int)
	price!: number;

	@Field({ nullable: true })
	categoryId?: string;

	@Field(() => Boolean)
	enabled!: boolean;

	@Field({ nullable: true })
	expenseId?: string;
}

@ObjectType()
export class InvoiceItem implements ObjectProperties<InvoiceItemEntity> {
	@Field()
	id!: string;

	@Field({ nullable: true })
	productId?: string;

	@Field()
	name!: string;

	@Field({ nullable: true })
	description?: string;

	@Field(() => Int)
	priceCents!: number;

	@Field(() => Int)
	taxPercentage!: number;

	@Field(() => Float)
	quantity!: number;

	@Field(() => [InvoiceItemExpense], {
		nullable: true,
		description:
			'The list of product expenses linked to this invoice item, with enabled/disabled state.',
	})
	linkedExpenses?: InvoiceItemExpense[];
}

@ObjectType()
export class InvoiceSubmissions
	implements ObjectProperties<InvoiceSubmissionEntity>
{
	@Field()
	id!: string;

	@Field(() => Date)
	submittedAt!: Date;

	@Field(() => InvoiceSubmissionType)
	type!: InvoiceSubmissionType;
}

@ObjectType()
export class InvoiceActivity
	implements ObjectProperties<InvoiceActivityEntity>
{
	@Field()
	id!: string;

	@Field()
	activityAt!: Date;

	@Field(() => InvoiceActivityType)
	type!: InvoiceActivityType;

	@Field({ nullable: true })
	user?: string;

	@Field({ nullable: true })
	notes?: string;

	@Field({ nullable: true })
	attachment?: string;
}

@ObjectType()
export class InvoiceLinks {
	@Field({ nullable: true })
	offerId?: string;

	@Field({ nullable: true })
	invoiceId?: string;
}

@ObjectType()
export class Invoice implements FilteredObjectProperties<InvoiceEntity> {
	@Field()
	id!: string;

	@Field({ nullable: true })
	subject?: string;

	@Field({ nullable: true })
	offerNumber?: string;

	@Field({ nullable: true })
	invoiceNumber?: string;

	@Field(() => InvoiceType)
	type!: InvoiceType;

	@Field(() => InvoiceStatus)
	status!: InvoiceStatus;

	@Field(() => [InvoiceSubmissions])
	submissions!: InvoiceSubmissions[];

	@Field()
	customer!: Customer;

	@Field()
	createdAt!: Date;

	@Field()
	updatedAt!: Date;

	@Field({ nullable: true })
	offeredAt?: Date;

	@Field({ nullable: true })
	invoicedAt?: Date;

	@Field({ nullable: true })
	dueAt?: Date;

	@Field(() => Int, { nullable: true })
	paidCents?: number;

	@Field({ nullable: true })
	paidAt?: Date;

	@Field({ nullable: true })
	paidVia?: string;

	@Field({ nullable: true })
	footerText?: string;

	@Field(() => [InvoiceItem])
	items!: InvoiceItem[];

	@Field(() => Int)
	totalCents!: number;

	@Field(() => Int)
	totalTax!: number;

	@Field(() => [InvoiceActivity])
	activity!: InvoiceActivity[];

	@Field(() => InvoiceLinks, { nullable: true })
	links?: InvoiceLinks;

	@Field({ nullable: true })
	contentHash?: string;
}

@InputType()
export class InvoiceWhereInput {
	@IsOptional()
	@Field(() => InvoiceType, { nullable: true })
	type?: InvoiceType;

	@IsOptional()
	@Field(() => InvoiceStatus, { nullable: true })
	status?: InvoiceStatus;

	@IsOptional()
	@Field(() => String, { nullable: true })
	search?: string;

	@IsOptional()
	@Field(() => Int, { nullable: true })
	year?: number;
}

@InputType()
export class InvoiceInput implements Partial<Omit<Invoice, 'items'>> {
	@IsOptional()
	@Field({ nullable: true })
	subject?: string;

	@IsUUID()
	@Field()
	customerId!: string;

	@Field({ nullable: true })
	offeredAt?: Date;

	@Field({ nullable: true })
	invoicedAt?: Date;

	@Field({ nullable: true })
	dueAt?: Date;

	@Field({ nullable: true })
	footerText?: string;

	@Field(() => [InvoiceItemInput])
	items!: InvoiceItemInput[];
}

@InputType()
export class InvoiceItemInput implements Partial<InvoiceItem> {
	@IsOptional()
	@IsUUID()
	@Field({ nullable: true })
	productId?: string;

	@IsString()
	@MaxLength(255)
	@Field()
	name!: string;

	@IsString()
	@IsOptional()
	@MaxLength(2048)
	@Field({ nullable: true })
	description?: string;

	@Field(() => Int)
	priceCents!: number;

	@IsOptional()
	@IsPositive()
	@Field(() => Int)
	taxPercentage!: number;

	@IsOptional()
	@Field(() => Float)
	quantity!: number;

	@Field({
		nullable: true,
		description: 'The ID of the linked expense, if this item generated one.',
	})
	expenseId?: string;

	@Field(() => [InvoiceItemExpense], {
		nullable: true,
		description:
			'The list of product expenses linked to this invoice item, with enabled/disabled state.',
	})
	linkedExpenses?: InvoiceItemExpenseInput[];
}

@ObjectType()
export class InvoiceChangedResponse {
	@Field()
	id!: string;

	@Field()
	activityId!: string;

	@Field()
	updatedAt!: Date;

	@Field(() => InvoiceActivityType)
	change!: InvoiceActivityType;
}

@InputType()
export class InvoicePaymentInput {
	@IsInt()
	@Field(() => Int)
	cents!: number;

	@Field()
	via!: string;

	@Field({ nullable: true })
	when?: Date;
}

@InputType()
export class InvoiceSubmissionInput {
	@IsNotEmpty()
	@Field(() => InvoiceSubmissionType)
	sendType!: InvoiceSubmissionType;

	@Field({ nullable: true })
	when?: Date;
}

@InputType()
export class InvoiceCustomerInput implements CustomerInput {
	@Field({ nullable: true })
	id?: string;

	@IsString()
	@Field()
	name!: string;

	@Field({ nullable: true })
	customerNumber?: string;

	@Field({ nullable: true })
	contactName?: string;

	@Field()
	showContact!: boolean;

	@Field({ nullable: true })
	email?: string;

	@Field({ nullable: true })
	street?: string;

	@Field({ nullable: true })
	zip?: string;

	@Field({ nullable: true })
	city?: string;

	@Field({ nullable: true })
	state?: string;

	@Field({ nullable: true })
	country?: string;

	@Field({ nullable: true })
	notes?: string;
}

@InputType()
export class InvoiceImportInput
	implements
		FilteredObjectProperties<
			Omit<
				InvoiceEntity,
				| 'items'
				| 'customer'
				| 'createdAt'
				| 'updatedAt'
				| 'id'
				| 'totalCents'
				| 'totalTax'
				| 'activity'
				| 'submissions'
			>
		>
{
	@IsString()
	@Field()
	customerId!: string;

	@IsOptional()
	@Field({ nullable: true })
	subject?: string;

	@IsOptional()
	@Field({ nullable: true })
	offerNumber?: string;

	@IsOptional()
	@Field({ nullable: true })
	invoiceNumber?: string;

	@IsOptional()
	@Field(() => InvoiceType)
	type!: InvoiceType;

	@IsOptional()
	@Field(() => InvoiceStatus, { nullable: true })
	status!: InvoiceStatus;

	@IsOptional()
	@Field({ nullable: true })
	offeredAt?: Date;

	@IsOptional()
	@Field({ nullable: true })
	invoicedAt?: Date;

	@IsOptional()
	@Field({ nullable: true })
	dueAt?: Date;

	@IsOptional()
	@Field(() => Int, { nullable: true })
	paidCents?: number;

	@IsOptional()
	@Field({ nullable: true })
	paidAt?: Date;

	@IsOptional()
	@Field({ nullable: true })
	paidVia?: string;

	@IsOptional()
	@Field({ nullable: true })
	footerText?: string;

	@IsOptional()
	@Field(() => [InvoiceItemInput], { nullable: true })
	items!: InvoiceItemInput[];
}

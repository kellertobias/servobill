import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Field, Float, InputType, Int, ObjectType } from 'type-graphql';
import { type InvoiceEntity, InvoiceStatus, InvoiceType } from '@/backend/entities/invoice.entity';
import {
  type InvoiceActivityEntity,
  InvoiceActivityType,
} from '@/backend/entities/invoice-activity.entity';
import type { InvoiceItemEntity } from '@/backend/entities/invoice-item.entity';
import {
  type InvoiceSubmissionEntity,
  InvoiceSubmissionType,
} from '@/backend/entities/invoice-submission.entity';
import type { ObjectProperties } from '@/common/ts-helpers';
import { Attachment } from '../attachments/attachment.schema';
import { Customer, type CustomerInput } from '../customers/customers.schema';
import type { FilteredObjectProperties } from '../types';

@InputType('InvoiceItemExpenseInput')
export class InvoiceItemExpenseInput {
  @Field(() => String)
  name!: string;

  @Field(() => Int)
  price!: number;

  @Field(() => String, { nullable: true })
  categoryId?: string;

  @Field(() => Boolean)
  enabled!: boolean;
}

@ObjectType('InvoiceItemExpense')
export class InvoiceItemExpense {
  @Field(() => String)
  name!: string;

  @Field(() => Int)
  price!: number;

  @Field(() => String, { nullable: true })
  categoryId?: string;

  @Field(() => Boolean)
  enabled!: boolean;

  @Field(() => String, { nullable: true })
  expenseId?: string;
}

@ObjectType('InvoiceItem')
export class InvoiceItem implements ObjectProperties<InvoiceItemEntity> {
  @Field(() => String)
  id!: string;

  @Field(() => String, { nullable: true })
  productId?: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
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

@ObjectType('InvoiceSubmissions')
export class InvoiceSubmissions implements ObjectProperties<InvoiceSubmissionEntity> {
  @Field(() => String)
  id!: string;

  @Field(() => Date)
  submittedAt!: Date;

  @Field(() => InvoiceSubmissionType)
  type!: InvoiceSubmissionType;

  @Field(() => Boolean)
  isScheduled!: boolean;

  @Field(() => Boolean)
  isCancelled!: boolean;
}

@ObjectType('InvoiceActivity')
export class InvoiceActivity implements ObjectProperties<InvoiceActivityEntity> {
  @Field(() => String)
  id!: string;

  @Field(() => Date)
  activityAt!: Date;

  @Field(() => InvoiceActivityType)
  type!: InvoiceActivityType;

  @Field(() => String, { nullable: true })
  user?: string;

  @Field(() => String, { nullable: true })
  notes?: string;

  @Field(() => Attachment, {
    nullable: true,
    description: 'The linked attachment details, if any',
  })
  attachment?: Attachment;

  /** If true, this attachment should be included in outgoing emails */
  @Field(() => Boolean, { nullable: true })
  attachToEmail?: boolean;
}

@ObjectType('InvoiceLinks')
export class InvoiceLinks {
  @Field(() => String, { nullable: true })
  offerId?: string;

  @Field(() => String, { nullable: true })
  invoiceId?: string;
}

@ObjectType('Invoice')
export class Invoice implements FilteredObjectProperties<InvoiceEntity> {
  @Field(() => String)
  id!: string;

  @Field(() => String, { nullable: true })
  subject?: string;

  @Field(() => String, { nullable: true })
  offerNumber?: string;

  @Field(() => String, { nullable: true })
  invoiceNumber?: string;

  @Field(() => InvoiceType)
  type!: InvoiceType;

  @Field(() => InvoiceStatus)
  status!: InvoiceStatus;

  @Field(() => [InvoiceSubmissions])
  submissions!: InvoiceSubmissions[];

  @Field(() => Customer)
  customer!: Customer;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => Date, { nullable: true })
  offeredAt?: Date;

  @Field(() => Date, { nullable: true })
  invoicedAt?: Date;

  @Field(() => Date, { nullable: true })
  dueAt?: Date;

  @Field(() => Int, { nullable: true })
  paidCents?: number;

  @Field(() => Date, { nullable: true })
  paidAt?: Date;

  @Field(() => String, { nullable: true })
  paidVia?: string;

  @Field(() => String, { nullable: true })
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

  @Field(() => String, { nullable: true })
  contentHash?: string;
}

@InputType('InvoiceWhereInput')
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

@InputType('InvoiceInput')
export class InvoiceInput implements Partial<Omit<Invoice, 'items'>> {
  @IsOptional()
  @Field(() => String, { nullable: true })
  subject?: string;

  @IsUUID()
  @Field(() => String)
  customerId!: string;

  @Field(() => Date, { nullable: true })
  offeredAt?: Date;

  @Field(() => Date, { nullable: true })
  invoicedAt?: Date;

  @Field(() => Date, { nullable: true })
  dueAt?: Date;

  @Field(() => String, { nullable: true })
  footerText?: string;

  @Field(() => [InvoiceItemInput])
  items!: InvoiceItemInput[];
}

@InputType('InvoiceItemInput')
export class InvoiceItemInput implements Partial<InvoiceItem> {
  @IsOptional()
  @IsUUID()
  @Field(() => String, { nullable: true })
  productId?: string;

  @IsString()
  @MaxLength(255)
  @Field(() => String)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2048)
  @Field(() => String, { nullable: true })
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

  @Field(() => [InvoiceItemExpenseInput], {
    nullable: true,
    description:
      'The list of product expenses linked to this invoice item, with enabled/disabled state.',
  })
  linkedExpenses?: InvoiceItemExpenseInput[];
}

@ObjectType('InvoiceChangedResponse')
export class InvoiceChangedResponse {
  @Field(() => String)
  id!: string;

  @Field(() => String, { nullable: true })
  activityId?: string;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => InvoiceActivityType)
  change!: InvoiceActivityType;
}

@InputType('InvoicePaymentInput')
export class InvoicePaymentInput {
  @IsInt()
  @Field(() => Int)
  cents!: number;

  @Field(() => String)
  via!: string;

  @Field(() => Date, { nullable: true })
  when?: Date;
}

@InputType('InvoiceActivityInput')
export class InvoiceActivityInput {
  @Field(() => String, { nullable: true })
  id?: string;

  @Field(() => Date)
  activityAt!: Date;

  @Field(() => InvoiceActivityType)
  type!: InvoiceActivityType;

  @Field(() => String, { nullable: true })
  user?: string;

  @Field(() => String, { nullable: true })
  notes?: string;

  @Field(() => Boolean, { nullable: true })
  attachToEmail?: boolean;

  @Field(() => String, { nullable: true })
  attachmentId?: string;
}

@InputType('InvoiceSubmissionInput')
export class InvoiceSubmissionInput {
  @IsNotEmpty()
  @Field(() => InvoiceSubmissionType)
  sendType!: InvoiceSubmissionType;

  @Field(() => Date, { nullable: true })
  when?: Date;
}

@InputType('InvoiceCustomerInput')
export class InvoiceCustomerInput implements CustomerInput {
  @Field(() => String, { nullable: true })
  id?: string;

  @IsString()
  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  customerNumber?: string;

  @Field(() => String, { nullable: true })
  contactName?: string;

  @Field(() => Boolean)
  showContact!: boolean;

  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => String, { nullable: true })
  street?: string;

  @Field(() => String, { nullable: true })
  zip?: string;

  @Field(() => String, { nullable: true })
  city?: string;

  @Field(() => String, { nullable: true })
  state?: string;

  @Field(() => String, { nullable: true })
  country?: string;

  @Field(() => String, { nullable: true })
  notes?: string;
}

@InputType('InvoiceImportInput')
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
  @Field(() => String)
  customerId!: string;

  @IsOptional()
  @Field(() => String, { nullable: true })
  subject?: string;

  @IsOptional()
  @Field(() => String, { nullable: true })
  offerNumber?: string;

  @IsOptional()
  @Field(() => String, { nullable: true })
  invoiceNumber?: string;

  @IsOptional()
  @Field(() => InvoiceType)
  type!: InvoiceType;

  @IsOptional()
  @Field(() => InvoiceStatus, { nullable: true })
  status!: InvoiceStatus;

  @IsOptional()
  @Field(() => Date, { nullable: true })
  offeredAt?: Date;

  @IsOptional()
  @Field(() => Date, { nullable: true })
  invoicedAt?: Date;

  @IsOptional()
  @Field(() => Date, { nullable: true })
  dueAt?: Date;

  @IsOptional()
  @Field(() => Int, { nullable: true })
  paidCents?: number;

  @IsOptional()
  @Field(() => Date, { nullable: true })
  paidAt?: Date;

  @IsOptional()
  @Field(() => String, { nullable: true })
  paidVia?: string;

  @IsOptional()
  @Field(() => String, { nullable: true })
  footerText?: string;

  @IsOptional()
  @Field(() => [InvoiceItemInput], { nullable: true })
  items!: InvoiceItemInput[];

  @IsOptional()
  @Field(() => [InvoiceActivityInput], { nullable: true })
  activity?: InvoiceActivityInput[];
}

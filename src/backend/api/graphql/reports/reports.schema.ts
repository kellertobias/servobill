import { IsNotEmpty } from 'class-validator';
import { Field, InputType, Int, ObjectType } from 'type-graphql';

import { ExpenseCategoryType } from '../system/system.schema';

@ObjectType('IncomeSurplusReportExport')
export class IncomeSurplusReportExport {
  @Field(() => String)
  location!: string;

  @Field(() => Date)
  startDate!: Date;

  @Field(() => Date)
  endDate!: Date;

  @Field(() => Date)
  generatedAt!: Date;
}

@ObjectType('IncomeSurplusReport')
export class IncomeSurplusReport {
  @Field(() => Date)
  startDate!: Date;

  @Field(() => Date)
  endDate!: Date;

  @Field(() => Int)
  incomeCents!: number;

  @Field(() => Int)
  invoiceTaxCents!: number;

  @Field(() => Int)
  expensesTaxCents!: number;

  @Field(() => Int)
  expensesCents!: number;

  @Field(() => Int)
  surplusCents!: number;

  @Field(() => Int)
  overdueCents!: number;

  @Field(() => Int)
  overdueInvoices!: number;

  @Field(() => Int)
  openCents!: number;

  @Field(() => Int)
  openInvoices!: number;

  @Field(() => [IncomeSurplusReportItem])
  items!: IncomeSurplusReportItem[];
}

@ObjectType('IncomeSurplusReportItem')
export class IncomeSurplusReportItem {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  type!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Date)
  valutaDate!: Date;

  @Field(() => Int)
  surplusCents!: number;

  @Field(() => Int)
  taxCents!: number;

  /**
   * The expense category, if available (for expenses only).
   */
  @Field(() => ExpenseCategoryType, { nullable: true })
  category?: ExpenseCategoryType;
}

@InputType('IncomeSurplusReportWhereInput')
export class IncomeSurplusReportWhereInput {
  @IsNotEmpty({
    message: 'Start date must be provided',
  })
  @Field(() => Date)
  startDate!: Date;

  @IsNotEmpty({
    message: 'End date must be provided',
  })
  @Field(() => Date)
  endDate!: Date;
}

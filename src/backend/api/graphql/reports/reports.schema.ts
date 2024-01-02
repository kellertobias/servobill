import { IsNotEmpty } from 'class-validator';
import { Field, ObjectType, InputType, Int } from 'type-graphql';

@ObjectType()
export class IncomeSurplusReportExport {
	@Field()
	location!: string;

	@Field()
	startDate!: Date;

	@Field()
	endDate!: Date;

	@Field()
	generatedAt!: Date;
}

@ObjectType()
export class IncomeSurplusReport {
	@Field()
	startDate!: Date;

	@Field()
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

@ObjectType()
export class IncomeSurplusReportItem {
	@Field()
	id!: string;

	@Field()
	type!: string;

	@Field()
	name!: string;

	@Field({ nullable: true })
	description?: string;

	@Field()
	valutaDate!: Date;

	@Field(() => Int)
	surplusCents!: number;

	@Field(() => Int)
	taxCents!: number;
}

@InputType()
export class IncomeSurplusReportWhereInput {
	@IsNotEmpty({
		message: 'Start date must be provided',
	})
	@Field()
	startDate!: Date;

	@IsNotEmpty({
		message: 'End date must be provided',
	})
	@Field()
	endDate!: Date;
}

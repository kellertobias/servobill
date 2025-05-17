import { Field, InputType, Int, ObjectType } from 'type-graphql';
import { IsString } from 'class-validator';

import { PdfTemplateSetting } from '@/backend/entities/settings.entity';
import { ObjectProperties } from '@/common/ts-helpers';

@ObjectType()
export class SettingsResultCompany {
	@Field()
	name!: string;

	@Field()
	street!: string;

	@Field()
	zip!: string;

	@Field()
	city!: string;

	@Field()
	taxId!: string;

	@Field()
	vatId!: string;

	@Field()
	email!: string;

	@Field()
	phone!: string;

	@Field()
	web!: string;

	@Field()
	bankAccountHolder!: string;

	@Field()
	bankIban!: string;

	@Field()
	bankBic!: string;
}

@ObjectType()
export class ExpenseCategoryType {
	@Field()
	id!: string;

	@Field()
	name!: string;

	@Field()
	color!: string;

	@Field()
	isDefault!: boolean;

	@Field({ nullable: true })
	reference?: string;

	@Field({ nullable: true })
	sumForTaxSoftware?: boolean;

	@Field({ nullable: true })
	description?: string;
}

@ObjectType()
export class SettingsResult {
	@Field()
	invoiceNumbersTemplate!: string;

	@Field()
	invoiceNumbersIncrementTemplate!: string;

	@Field()
	invoiceNumbersLast!: string;

	@Field()
	offerNumbersTemplate!: string;

	@Field()
	offerNumbersIncrementTemplate!: string;

	@Field()
	offerNumbersLast!: string;

	@Field()
	customerNumbersTemplate!: string;

	@Field()
	customerNumbersIncrementTemplate!: string;

	@Field()
	customerNumbersLast!: string;

	@Field()
	emailTemplate!: string;

	@Field()
	emailSubjectInvoices!: string;

	@Field()
	emailSubjectOffers!: string;

	@Field()
	emailSubjectReminder!: string;

	@Field()
	emailSubjectWarning!: string;

	@Field()
	sendFrom!: string;

	@Field()
	replyTo!: string;

	@Field()
	invoiceCompanyLogo!: string;

	@Field()
	emailCompanyLogo!: string;

	@Field(() => Int)
	offerValidityDays!: number;

	@Field(() => Int)
	defaultInvoiceDueDays!: number;

	@Field()
	defaultInvoiceFooterText!: string;

	@Field(() => SettingsResultCompany)
	company!: SettingsResultCompany;

	@Field(() => [ExpenseCategoryType])
	categories!: ExpenseCategoryType[];
}

@InputType()
export class SettingsCompanyInput implements SettingsResultCompany {
	@IsString()
	@Field()
	name!: string;

	@IsString()
	@Field()
	street!: string;

	@IsString()
	@Field()
	zip!: string;

	@IsString()
	@Field()
	city!: string;

	@IsString()
	@Field()
	taxId!: string;

	@IsString()
	@Field()
	vatId!: string;

	@IsString()
	@Field()
	email!: string;

	@IsString()
	@Field()
	phone!: string;

	@IsString()
	@Field()
	web!: string;

	@IsString()
	@Field()
	bankAccountHolder!: string;

	@IsString()
	@Field()
	bankIban!: string;

	@IsString()
	@Field()
	bankBic!: string;
}

@InputType()
export class SettingsInput implements SettingsResult {
	@IsString()
	@Field()
	invoiceNumbersTemplate!: string;

	@IsString()
	@Field()
	invoiceNumbersIncrementTemplate!: string;

	@IsString()
	@Field()
	invoiceNumbersLast!: string;

	@IsString()
	@Field()
	offerNumbersTemplate!: string;

	@IsString()
	@Field()
	offerNumbersIncrementTemplate!: string;

	@IsString()
	@Field()
	offerNumbersLast!: string;

	@IsString()
	@Field()
	customerNumbersTemplate!: string;

	@IsString()
	@Field()
	customerNumbersIncrementTemplate!: string;

	@IsString()
	@Field()
	customerNumbersLast!: string;

	@IsString()
	@Field()
	emailTemplate!: string;

	@IsString()
	@Field()
	emailSubjectInvoices!: string;

	@IsString()
	@Field()
	emailSubjectOffers!: string;

	@IsString()
	@Field()
	emailSubjectReminder!: string;

	@IsString()
	@Field()
	emailSubjectWarning!: string;

	@IsString()
	@Field()
	sendFrom!: string;

	@IsString()
	@Field()
	replyTo!: string;

	@IsString()
	@Field()
	invoiceCompanyLogo!: string;

	@IsString()
	@Field()
	emailCompanyLogo!: string;

	@Field(() => Int)
	offerValidityDays!: number;

	@Field(() => Int)
	defaultInvoiceDueDays!: number;

	@IsString()
	@Field()
	defaultInvoiceFooterText!: string;

	@Field(() => SettingsCompanyInput)
	company!: SettingsCompanyInput;

	@Field(() => [ExpenseCategoryType])
	categories!: ExpenseCategoryType[];
}

@ObjectType()
export class InvoiceTemplateResult
	implements
		Pick<ObjectProperties<PdfTemplateSetting>, 'pdfTemplate' | 'pdfStyles'>
{
	@Field()
	pdfTemplate!: string;

	@Field()
	pdfStyles!: string;
}

@InputType()
export class InvoiceTemplateInput implements InvoiceTemplateResult {
	@IsString()
	@Field()
	pdfTemplate!: string;

	@IsString()
	@Field()
	pdfStyles!: string;
}

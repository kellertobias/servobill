import { Field, InputType, Int, ObjectType } from 'type-graphql';
import { IsString } from 'class-validator';

import { PdfTemplateSetting } from '@/backend/entities/settings.entity';
import { ObjectProperties } from '@/common/ts-helpers';

@ObjectType()
export class SettingsResultCompany {
	/**
	 * Company name. Now nullable.
	 */
	@Field({ nullable: true })
	name?: string;

	/**
	 * Company street. Now nullable.
	 */
	@Field({ nullable: true })
	street?: string;

	/**
	 * Company zip code. Now nullable.
	 */
	@Field({ nullable: true })
	zip?: string;

	/**
	 * Company city. Now nullable.
	 */
	@Field({ nullable: true })
	city?: string;

	/**
	 * Company tax ID. Now nullable.
	 */
	@Field({ nullable: true })
	taxId?: string;

	/**
	 * Company VAT ID. Now nullable.
	 */
	@Field({ nullable: true })
	vatId?: string;

	/**
	 * Company email. Now nullable.
	 */
	@Field({ nullable: true })
	email?: string;

	/**
	 * Company phone. Now nullable.
	 */
	@Field({ nullable: true })
	phone?: string;

	/**
	 * Company web. Now nullable.
	 */
	@Field({ nullable: true })
	web?: string;

	/**
	 * Bank account holder. Now nullable.
	 */
	@Field({ nullable: true })
	bankAccountHolder?: string;

	/**
	 * Bank IBAN. Now nullable.
	 */
	@Field({ nullable: true })
	bankIban?: string;

	/**
	 * Bank BIC. Now nullable.
	 */
	@Field({ nullable: true })
	bankBic?: string;
}

@InputType('ExpenseCategoryInputType')
@ObjectType()
export class ExpenseCategoryType {
	/**
	 * Category ID. Now nullable.
	 */
	@Field()
	id!: string;

	/**
	 * Category name. Now nullable.
	 */
	@Field()
	name!: string;

	/**
	 * Category color. Now nullable.
	 */
	@Field({ nullable: true })
	color?: string;

	/**
	 * Is default category. Now nullable.
	 */
	@Field(() => Boolean, { nullable: true })
	isDefault?: boolean;

	/**
	 * Reference. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	reference?: string;

	/**
	 * Sum for tax software. Now nullable.
	 */
	@Field(() => Boolean, { nullable: true })
	sumForTaxSoftware?: boolean;

	/**
	 * Description. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	description?: string;
}

@ObjectType()
export class SettingsResult {
	/**
	 * Template for invoice numbers. Now nullable.
	 */
	@Field({ nullable: true })
	invoiceNumbersTemplate?: string;

	/**
	 * Increment template for invoice numbers. Now nullable.
	 */
	@Field({ nullable: true })
	invoiceNumbersIncrementTemplate?: string;

	/**
	 * Last used invoice number. Now nullable.
	 */
	@Field({ nullable: true })
	invoiceNumbersLast?: string;

	/**
	 * Template for offer numbers. Now nullable.
	 */
	@Field({ nullable: true })
	offerNumbersTemplate?: string;

	/**
	 * Increment template for offer numbers. Now nullable.
	 */
	@Field({ nullable: true })
	offerNumbersIncrementTemplate?: string;

	/**
	 * Last used offer number. Now nullable.
	 */
	@Field({ nullable: true })
	offerNumbersLast?: string;

	/**
	 * Template for customer numbers. Now nullable.
	 */
	@Field({ nullable: true })
	customerNumbersTemplate?: string;

	/**
	 * Increment template for customer numbers. Now nullable.
	 */
	@Field({ nullable: true })
	customerNumbersIncrementTemplate?: string;

	/**
	 * Last used customer number. Now nullable.
	 */
	@Field({ nullable: true })
	customerNumbersLast?: string;

	/**
	 * Email template. Now nullable.
	 */
	@Field({ nullable: true })
	emailTemplate?: string;

	/**
	 * Email subject for invoices. Now nullable.
	 */
	@Field({ nullable: true })
	emailSubjectInvoices?: string;

	/**
	 * Email subject for offers. Now nullable.
	 */
	@Field({ nullable: true })
	emailSubjectOffers?: string;

	/**
	 * Email subject for reminders. Now nullable.
	 */
	@Field({ nullable: true })
	emailSubjectReminder?: string;

	/**
	 * Email subject for warnings. Now nullable.
	 */
	@Field({ nullable: true })
	emailSubjectWarning?: string;

	/**
	 * Sender email address. Now nullable.
	 */
	@Field({ nullable: true })
	sendFrom?: string;

	/**
	 * Reply-to email address. Now nullable.
	 */
	@Field({ nullable: true })
	replyTo?: string;

	/**
	 * Company logo for invoices. Now nullable.
	 */
	@Field({ nullable: true })
	invoiceCompanyLogo?: string;

	/**
	 * Company logo for emails. Now nullable.
	 */
	@Field({ nullable: true })
	emailCompanyLogo?: string;

	/**
	 * Validity days for offers. Now nullable.
	 */
	@Field(() => Int, { nullable: true })
	offerValidityDays?: number;

	/**
	 * Default due days for invoices. Now nullable.
	 */
	@Field(() => Int, { nullable: true })
	defaultInvoiceDueDays?: number;

	/**
	 * Default footer text for invoices. Now nullable.
	 */
	@Field({ nullable: true })
	defaultInvoiceFooterText?: string;

	/**
	 * Company settings. Now nullable.
	 */
	@Field(() => SettingsResultCompany, { nullable: true })
	company?: SettingsResultCompany;

	/**
	 * Expense categories. Now nullable.
	 */
	@Field(() => [ExpenseCategoryType], { nullable: true })
	categories?: ExpenseCategoryType[];
}

@InputType()
export class SettingsCompanyInput implements Partial<SettingsResultCompany> {
	@IsString()
	@Field({ nullable: true })
	name?: string;

	@IsString()
	@Field({ nullable: true })
	street?: string;

	@IsString()
	@Field({ nullable: true })
	zip?: string;

	@IsString()
	@Field({ nullable: true })
	city?: string;

	@IsString()
	@Field({ nullable: true })
	taxId?: string;

	@IsString()
	@Field({ nullable: true })
	vatId?: string;

	@IsString()
	@Field({ nullable: true })
	email?: string;

	@IsString()
	@Field({ nullable: true })
	phone?: string;

	@IsString()
	@Field({ nullable: true })
	web?: string;

	@IsString()
	@Field({ nullable: true })
	bankAccountHolder?: string;

	@IsString()
	@Field({ nullable: true })
	bankIban?: string;

	@IsString()
	@Field({ nullable: true })
	bankBic?: string;
}

/**
 * Input type for settings. All fields are now nullable.
 */
@InputType()
export class SettingsInput implements Partial<SettingsResult> {
	@IsString()
	@Field({ nullable: true })
	invoiceNumbersTemplate?: string;

	@IsString()
	@Field({ nullable: true })
	invoiceNumbersIncrementTemplate?: string;

	@IsString()
	@Field({ nullable: true })
	invoiceNumbersLast?: string;

	@IsString()
	@Field({ nullable: true })
	offerNumbersTemplate?: string;

	@IsString()
	@Field({ nullable: true })
	offerNumbersIncrementTemplate?: string;

	@IsString()
	@Field({ nullable: true })
	offerNumbersLast?: string;

	@IsString()
	@Field({ nullable: true })
	customerNumbersTemplate?: string;

	@IsString()
	@Field({ nullable: true })
	customerNumbersIncrementTemplate?: string;

	@IsString()
	@Field({ nullable: true })
	customerNumbersLast?: string;

	@IsString()
	@Field({ nullable: true })
	emailTemplate?: string;

	@IsString()
	@Field({ nullable: true })
	emailSubjectInvoices?: string;

	@IsString()
	@Field({ nullable: true })
	emailSubjectOffers?: string;

	@IsString()
	@Field({ nullable: true })
	emailSubjectReminder?: string;

	@IsString()
	@Field({ nullable: true })
	emailSubjectWarning?: string;

	@IsString()
	@Field({ nullable: true })
	sendFrom?: string;

	@IsString()
	@Field({ nullable: true })
	replyTo?: string;

	@IsString()
	@Field({ nullable: true })
	invoiceCompanyLogo?: string;

	@IsString()
	@Field({ nullable: true })
	emailCompanyLogo?: string;

	@Field(() => Int, { nullable: true })
	offerValidityDays?: number;

	@Field(() => Int, { nullable: true })
	defaultInvoiceDueDays?: number;

	@IsString()
	@Field({ nullable: true })
	defaultInvoiceFooterText?: string;

	@Field(() => SettingsCompanyInput, { nullable: true })
	company?: SettingsCompanyInput;

	@Field(() => [ExpenseCategoryType], { nullable: true })
	categories?: ExpenseCategoryType[];
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

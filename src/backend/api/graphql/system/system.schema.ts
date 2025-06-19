import { Field, InputType, Int, ObjectType } from 'type-graphql';
import { IsBoolean, IsString } from 'class-validator';

import { PdfTemplateSetting } from '@/backend/entities/settings.entity';
import { ObjectProperties } from '@/common/ts-helpers';

@ObjectType('SettingsResultCompany')
export class SettingsResultCompany {
	/**
	 * Company name. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	name?: string;

	/**
	 * Company street. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	street?: string;

	/**
	 * Company zip code. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	zip?: string;

	/**
	 * Company city. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	city?: string;

	/**
	 * Company tax ID. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	taxId?: string;

	/**
	 * Company VAT ID. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	vatId?: string;

	/**
	 * Company email. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	email?: string;

	/**
	 * Company phone. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	phone?: string;

	/**
	 * Company web. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	web?: string;

	/**
	 * Bank account holder. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	bankAccountHolder?: string;

	/**
	 * Bank IBAN. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	bankIban?: string;

	/**
	 * Bank BIC. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	bankBic?: string;
}

@InputType('ExpenseCategoryInputType')
export class ExpenseCategoryInputType {
	/**
	 * Category ID. Now nullable.
	 */
	@IsString()
	@Field(() => String, { nullable: true })
	categoryId?: string;

	/**
	 * Category name. Now nullable.
	 */
	@IsString()
	@Field(() => String)
	name!: string;

	/**
	 * Category color. Now nullable.
	 */
	@IsString()
	@Field(() => String, { nullable: true })
	color?: string;

	/**
	 * Is default category. Now nullable.
	 */
	@IsBoolean()
	@Field(() => Boolean, { nullable: true })
	isDefault?: boolean;

	/**
	 * Reference. Now nullable.
	 */
	@IsString()
	@Field(() => String, { nullable: true })
	reference?: string;

	/**
	 * Sum for tax software. Now nullable.
	 */
	@IsBoolean()
	@Field(() => Boolean, { nullable: true })
	sumForTaxSoftware?: boolean;

	/**
	 * Description. Now nullable.
	 */
	@IsString()
	@Field(() => String, { nullable: true })
	description?: string;
}

@ObjectType('ExpenseCategoryType')
export class ExpenseCategoryType {
	/**
	 * Category ID. Now nullable.
	 */
	@Field(() => String)
	id!: string;

	/**
	 * Category name. Now nullable.
	 */
	@Field(() => String)
	name!: string;

	/**
	 * Category color. Now nullable.
	 */
	@Field(() => String, { nullable: true })
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

@ObjectType('SettingsResult')
export class SettingsResult {
	/**
	 * Template for invoice numbers. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	invoiceNumbersTemplate?: string;

	/**
	 * Increment template for invoice numbers. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	invoiceNumbersIncrementTemplate?: string;

	/**
	 * Last used invoice number. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	invoiceNumbersLast?: string;

	/**
	 * Template for offer numbers. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	offerNumbersTemplate?: string;

	/**
	 * Increment template for offer numbers. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	offerNumbersIncrementTemplate?: string;

	/**
	 * Last used offer number. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	offerNumbersLast?: string;

	/**
	 * Template for customer numbers. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	customerNumbersTemplate?: string;

	/**
	 * Increment template for customer numbers. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	customerNumbersIncrementTemplate?: string;

	/**
	 * Last used customer number. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	customerNumbersLast?: string;

	/**
	 * Email template. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	emailTemplate?: string;

	/**
	 * Email subject for invoices. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	emailSubjectInvoices?: string;

	/**
	 * Email subject for offers. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	emailSubjectOffers?: string;

	/**
	 * Email subject for reminders. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	emailSubjectReminder?: string;

	/**
	 * Email subject for warnings. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	emailSubjectWarning?: string;

	/**
	 * Sender email address. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	sendFrom?: string;

	/**
	 * Reply-to email address. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	replyTo?: string;

	/**
	 * Company logo for invoices. Now nullable.
	 */
	@Field(() => String, { nullable: true })
	invoiceCompanyLogo?: string;

	/**
	 * Company logo for emails. Now nullable.
	 */
	@Field(() => String, { nullable: true })
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
	@Field(() => String, { nullable: true })
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

@InputType('SettingsCompanyInput')
export class SettingsCompanyInput implements Partial<SettingsResultCompany> {
	@IsString()
	@Field(() => String, { nullable: true })
	name?: string;

	@IsString()
	@Field(() => String, { nullable: true })
	street?: string;

	@IsString()
	@Field(() => String, { nullable: true })
	zip?: string;

	@IsString()
	@Field(() => String, { nullable: true })
	city?: string;

	@IsString()
	@Field(() => String, { nullable: true })
	taxId?: string;

	@IsString()
	@Field(() => String, { nullable: true })
	vatId?: string;

	@IsString()
	@Field(() => String, { nullable: true })
	email?: string;

	@IsString()
	@Field(() => String, { nullable: true })
	phone?: string;

	@IsString()
	@Field(() => String, { nullable: true })
	web?: string;

	@IsString()
	@Field(() => String, { nullable: true })
	bankAccountHolder?: string;

	@IsString()
	@Field(() => String, { nullable: true })
	bankIban?: string;

	@IsString()
	@Field(() => String, { nullable: true })
	bankBic?: string;
}

/**
 * Input type for settings. All fields are now nullable.
 */
@InputType('SettingsInput')
export class SettingsInput implements Partial<SettingsResult> {
	@IsString()
	@Field(() => String, { nullable: true })
	invoiceNumbersTemplate?: string;

	@IsString()
	@Field(() => String, { nullable: true })
	invoiceNumbersIncrementTemplate?: string;

	@IsString()
	@Field(() => String, { nullable: true })
	invoiceNumbersLast?: string;

	@IsString()
	@Field(() => String, { nullable: true })
	offerNumbersTemplate?: string;

	@IsString()
	@Field(() => String, { nullable: true })
	offerNumbersIncrementTemplate?: string;

	@IsString()
	@Field(() => String, { nullable: true })
	offerNumbersLast?: string;

	@IsString()
	@Field(() => String, { nullable: true })
	customerNumbersTemplate?: string;

	@IsString()
	@Field(() => String, { nullable: true })
	customerNumbersIncrementTemplate?: string;

	@IsString()
	@Field(() => String, { nullable: true })
	customerNumbersLast?: string;

	@IsString()
	@Field(() => String, { nullable: true })
	emailTemplate?: string;

	@IsString()
	@Field(() => String, { nullable: true })
	emailSubjectInvoices?: string;

	@IsString()
	@Field(() => String, { nullable: true })
	emailSubjectOffers?: string;

	@IsString()
	@Field(() => String, { nullable: true })
	emailSubjectReminder?: string;

	@IsString()
	@Field(() => String, { nullable: true })
	emailSubjectWarning?: string;

	@IsString()
	@Field(() => String, { nullable: true })
	sendFrom?: string;

	@IsString()
	@Field(() => String, { nullable: true })
	replyTo?: string;

	@IsString()
	@Field(() => String, { nullable: true })
	invoiceCompanyLogo?: string;

	@IsString()
	@Field(() => String, { nullable: true })
	emailCompanyLogo?: string;

	@Field(() => Int, { nullable: true })
	offerValidityDays?: number;

	@Field(() => Int, { nullable: true })
	defaultInvoiceDueDays?: number;

	@IsString()
	@Field(() => String, { nullable: true })
	defaultInvoiceFooterText?: string;

	@Field(() => SettingsCompanyInput, { nullable: true })
	company?: SettingsCompanyInput;
}

@ObjectType('InvoiceTemplateResult')
export class InvoiceTemplateResult
	implements
		Pick<ObjectProperties<PdfTemplateSetting>, 'pdfTemplate' | 'pdfStyles'>
{
	@Field(() => String)
	pdfTemplate!: string;

	@Field(() => String)
	pdfStyles!: string;
}

@InputType('InvoiceTemplateInput')
export class InvoiceTemplateInput implements InvoiceTemplateResult {
	@IsString()
	@Field(() => String)
	pdfTemplate!: string;

	@IsString()
	@Field(() => String)
	pdfStyles!: string;
}

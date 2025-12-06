/* eslint-disable @typescript-eslint/no-explicit-any */

import { CustomJson } from '@/common/json';
import { Numbering } from '@/common/numbers';
import type { ObjectProperties } from '@/common/ts-helpers';
import { DomainEntity } from './abstract.entity';

/**
 * Enum for supported invoice output formats.
 */
export enum InvoiceOutputFormat {
	PDF = 'PDF',
	XRECHNUNG_PDF = 'XRECHNUNG_PDF',
	XRECHNUNG = 'XRECHNUNG',
	ZUGFERD = 'ZUGFERD',
}

/**
 * Enum representing the VAT/tax status of the company.
 *
 * - VAT_ENABLED: VAT is enabled and invoices include VAT.
 * - VAT_DISABLED_KLEINUNTERNEHMER: VAT is disabled due to Kleinunternehmerregelung (§ 19 UStG, Germany).
 * - VAT_DISABLED_OTHER: VAT is disabled for other reasons (e.g., non-profit, foreign entity, etc).
 */
export enum VatStatus {
	VAT_ENABLED = 'VAT_ENABLED',
	VAT_DISABLED_KLEINUNTERNEHMER = 'VAT_DISABLED_KLEINUNTERNEHMER',
	// Feel free to open a PR to add more VAT statuses
	VAT_DISABLED_OTHER = 'VAT_DISABLED_OTHER',
}

export abstract class AbstractSettingsEntity {
	public async save(): Promise<void> {}
	public static settingId: string;

	constructor(
		params: any,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_saveInner: (data: string) => Promise<void>,
	) {
		Object.assign(this, params);
	}
}

export class CompanyDataSetting extends AbstractSettingsEntity {
	public static settingId = 'company-data';

	public emailTemplate!: string;
	public emailSubjectInvoices!: string;
	public emailSubjectOffers!: string;
	public emailSubjectReminder!: string;
	public emailSubjectWarning!: string;
	public invoiceCompanyLogo!: string;
	public emailCompanyLogo!: string;
	public companyData!: {
		name: string;
		street: string;
		zip: string;
		city: string;
		taxId: string;
		email: string;
		phone: string;
		web: string;
		vatId: string;
		bank: {
			accountHolder: string;
			iban: string;
			bic: string;
		};
		/**
		 * The ISO 3166-1 alpha-2 country code (e.g. 'DE', 'US') representing the company's country.
		 * Used for address formatting, tax calculations, and compliance.
		 */
		countryCode:
			| 'AF'
			| 'AL'
			| 'DZ'
			| 'AS'
			| 'AD'
			| 'AO'
			| 'AI'
			| 'AQ'
			| 'AG'
			| 'AR'
			| 'AM'
			| 'AW'
			| 'AU'
			| 'AT'
			| 'AZ'
			| 'BS'
			| 'BH'
			| 'BD'
			| 'BB'
			| 'BY'
			| 'BE'
			| 'BZ'
			| 'BJ'
			| 'BM'
			| 'AX'
			| 'BT'
			| 'BO'
			| 'BQ'
			| 'BA'
			| 'BW'
			| 'BV'
			| 'BR'
			| 'IO'
			| 'BN'
			| 'BG'
			| 'BF'
			| 'BI'
			| 'CV'
			| 'KH'
			| 'CM'
			| 'CA'
			| 'KY'
			| 'CF'
			| 'TD'
			| 'CL'
			| 'CN'
			| 'CX'
			| 'CC'
			| 'CO'
			| 'KM'
			| 'CD'
			| 'CG'
			| 'CK'
			| 'CR'
			| 'HR'
			| 'CU'
			| 'CW'
			| 'CY'
			| 'CZ'
			| 'CI'
			| 'DK'
			| 'DJ'
			| 'DM'
			| 'DO'
			| 'EC'
			| 'EG'
			| 'SV'
			| 'GQ'
			| 'ER'
			| 'EE'
			| 'SZ'
			| 'ET'
			| 'FK'
			| 'FO'
			| 'FJ'
			| 'FI'
			| 'FR'
			| 'GF'
			| 'PF'
			| 'TF'
			| 'GA'
			| 'GM'
			| 'GE'
			| 'DE'
			| 'GH'
			| 'GI'
			| 'GR'
			| 'GL'
			| 'GD'
			| 'GP'
			| 'GU'
			| 'GT'
			| 'GG'
			| 'GN'
			| 'GW'
			| 'GY'
			| 'HT'
			| 'HM'
			| 'VA'
			| 'HN'
			| 'HK'
			| 'HU'
			| 'IS'
			| 'IN'
			| 'ID'
			| 'IR'
			| 'IQ'
			| 'IE'
			| 'IM'
			| 'IL'
			| 'IT'
			| 'JM'
			| 'JP'
			| 'JE'
			| 'JO'
			| 'KZ'
			| 'KE'
			| 'KI'
			| 'KP'
			| 'KR'
			| 'KW'
			| 'KG'
			| 'LA'
			| 'LV'
			| 'LB'
			| 'LS'
			| 'LR'
			| 'LY'
			| 'LI'
			| 'LT'
			| 'LU'
			| 'MO'
			| 'MG'
			| 'MW'
			| 'MY'
			| 'MV'
			| 'ML'
			| 'MT'
			| 'MH'
			| 'MQ'
			| 'MR'
			| 'MU'
			| 'YT'
			| 'MX'
			| 'FM'
			| 'MD'
			| 'MC'
			| 'MN'
			| 'ME'
			| 'MS'
			| 'MA'
			| 'MZ'
			| 'MM'
			| 'NA'
			| 'NR'
			| 'NP'
			| 'NL'
			| 'NC'
			| 'NZ'
			| 'NI'
			| 'NE'
			| 'NG'
			| 'NU'
			| 'NF'
			| 'MK'
			| 'MP'
			| 'NO'
			| 'OM'
			| 'PK'
			| 'PW'
			| 'PS'
			| 'PA'
			| 'PG'
			| 'PY'
			| 'PE'
			| 'PH'
			| 'PN'
			| 'PL'
			| 'PT'
			| 'PR'
			| 'QA'
			| 'RO'
			| 'RU'
			| 'RW'
			| 'RE'
			| 'BL'
			| 'SH'
			| 'KN'
			| 'LC'
			| 'MF'
			| 'PM'
			| 'VC'
			| 'WS'
			| 'SM'
			| 'ST'
			| 'SA'
			| 'SN'
			| 'RS'
			| 'SC'
			| 'SL'
			| 'SG'
			| 'SX'
			| 'SK'
			| 'SI'
			| 'SB'
			| 'SO'
			| 'ZA'
			| 'GS'
			| 'SS'
			| 'ES'
			| 'LK'
			| 'SD'
			| 'SR'
			| 'SJ'
			| 'SE'
			| 'CH'
			| 'SY'
			| 'TW'
			| 'TJ'
			| 'TZ'
			| 'TH'
			| 'TL'
			| 'TG'
			| 'TK'
			| 'TO'
			| 'TT'
			| 'TN'
			| 'TM'
			| 'TC'
			| 'TV'
			| 'TR'
			| 'UG'
			| 'UA'
			| 'AE'
			| 'GB'
			| 'UM'
			| 'US'
			| 'UY'
			| 'UZ'
			| 'VU'
			| 'VE'
			| 'VN'
			| 'VG'
			| 'VI'
			| 'WF'
			| 'EH'
			| 'YE'
			| 'ZM'
			| 'ZW';
	};

	public sendFrom!: string;
	public replyTo!: string;

	/**
	 * The currency code (ISO 4217, e.g. 'EUR', 'USD') used for all monetary values in the company context.
	 * This setting is used for receipts, invoices, and summary emails.
	 */
	public currency!: string;

	/**
	 * The VAT/tax status of the company. Determines if VAT is shown on invoices and which legal regime applies.
	 * - VAT_ENABLED: VAT is enabled and invoices include VAT.
	 * - VAT_DISABLED_KLEINUNTERNEHMER: VAT is disabled due to Kleinunternehmerregelung (§ 19 UStG, Germany).
	 * - VAT_DISABLED_OTHER: VAT is disabled for other reasons (e.g., non-profit, foreign entity, etc).
	 */
	public vatStatus: VatStatus = VatStatus.VAT_ENABLED;

	constructor(
		params: Partial<ObjectProperties<CompanyDataSetting>>,
		private saveInner: (data: string) => Promise<void>,
	) {
		super(params, saveInner);
		Object.assign(this, params);

		if (!this.emailTemplate) {
			this.emailTemplate = params.emailTemplate || '';
		}
		if (!this.emailSubjectInvoices) {
			this.emailSubjectInvoices = params.emailSubjectInvoices || '';
		}
		if (!this.emailSubjectOffers) {
			this.emailSubjectOffers = params.emailSubjectOffers || '';
		}
		if (!this.emailSubjectReminder) {
			this.emailSubjectReminder = params.emailSubjectReminder || '';
		}
		if (!this.emailSubjectWarning) {
			this.emailSubjectWarning = params.emailSubjectWarning || '';
		}
		if (!this.sendFrom) {
			this.sendFrom = params.sendFrom || '';
		}
		if (!this.replyTo) {
			this.replyTo = params.replyTo || '';
		}
		if (!this.invoiceCompanyLogo) {
			this.invoiceCompanyLogo = params.invoiceCompanyLogo || '';
		}
		if (!this.emailCompanyLogo) {
			this.emailCompanyLogo = params.emailCompanyLogo || '';
		}
		if (!this.companyData) {
			this.companyData = {
				name: params.companyData?.name || '',
				street: params.companyData?.street || '',
				zip: params.companyData?.zip || '',
				city: params.companyData?.city || '',
				taxId: params.companyData?.taxId || '',
				vatId: params.companyData?.vatId || '',
				email: params.companyData?.email || '',
				phone: params.companyData?.phone || '',
				web: params.companyData?.web || '',
				bank: {
					accountHolder: params.companyData?.bank?.accountHolder || '',
					iban: params.companyData?.bank?.iban || '',
					bic: params.companyData?.bank?.bic || '',
				},
				countryCode: params.companyData?.countryCode || 'DE',
			};
		}
		if (!this.currency) {
			this.currency = params.currency || 'EUR';
		}
		if (
			params.vatStatus &&
			Object.values(VatStatus).includes(params.vatStatus)
		) {
			this.vatStatus = params.vatStatus;
		} else if (
			typeof params.vatStatus === 'string' &&
			VatStatus[params.vatStatus as keyof typeof VatStatus]
		) {
			this.vatStatus = VatStatus[params.vatStatus as keyof typeof VatStatus];
		} else {
			this.vatStatus = VatStatus.VAT_ENABLED;
		}
	}

	public serializable() {
		return {
			emailTemplate: this.emailTemplate,
			emailSubjectInvoices: this.emailSubjectInvoices,
			emailSubjectOffers: this.emailSubjectOffers,
			emailSubjectReminder: this.emailSubjectReminder,
			emailSubjectWarning: this.emailSubjectWarning,
			invoiceCompanyLogo: this.invoiceCompanyLogo,
			emailCompanyLogo: this.emailCompanyLogo,
			sendFrom: this.sendFrom,
			replyTo: this.replyTo,
			companyData: this.companyData,
			currency: this.currency,
			vatStatus: this.vatStatus,
		};
	}

	public save(): Promise<void> {
		const data = CustomJson.toJson(this.serializable());

		return this.saveInner(data);
	}
}

export class PdfTemplateSetting extends AbstractSettingsEntity {
	public static settingId = 'stationary-template';
	public pdfTemplate!: string;
	public pdfStyles!: string;

	constructor(
		params: Partial<ObjectProperties<PdfTemplateSetting>>,
		private saveInner: (data: string) => Promise<void>,
	) {
		super(params, saveInner);
		if (!this.pdfTemplate) {
			this.pdfTemplate = params.pdfTemplate || '';
		}
		if (!this.pdfStyles) {
			this.pdfStyles = params.pdfStyles || '';
		}
	}

	public serializable() {
		return {
			pdfTemplate: this.pdfTemplate,
			pdfStyles: this.pdfStyles,
		};
	}

	public save(): Promise<void> {
		const data = CustomJson.toJson(this.serializable());

		return this.saveInner(data);
	}
}

class IncrementNumberBehavior {
	public template!: string; // e.g. INV-YYMM-XXXX
	public incrementTemplate!: string; // e.g. YY-XXXX
	public lastNumber!: string;

	constructor(
		params: Partial<ObjectProperties<IncrementNumberBehavior>>,
		private parent?: InvoiceSettingsEntity,
	) {
		Object.assign(this, params);
		if (!this.template) {
			this.template = params.template || '';
		}
		if (!this.incrementTemplate) {
			this.incrementTemplate = params.incrementTemplate || '';
		}
		if (!this.lastNumber) {
			this.lastNumber = params.lastNumber || '';
		}
	}

	public async update({
		template,
		incrementTemplate,
		lastNumber,
	}: {
		template?: string;
		incrementTemplate?: string;
		lastNumber?: string;
	}): Promise<void> {
		if (template !== undefined) {
			this.template = template;
		}
		if (incrementTemplate !== undefined) {
			this.incrementTemplate = incrementTemplate;
		}
		if (lastNumber !== undefined) {
			this.lastNumber = lastNumber;
		}
	}

	public serializable() {
		return {
			template: this.template,
			incrementTemplate: this.incrementTemplate,
			lastNumber: this.lastNumber,
		};
	}

	public async getNextNumber(): Promise<string> {
		const nextNumber = Numbering.makeNextNumber(
			this.template,
			this.incrementTemplate,
			this.lastNumber,
		);
		this.lastNumber = nextNumber;

		await this.parent?.save();

		return nextNumber;
	}
}

/**
 * Settings for invoice numbering, output format, and defaults.
 */
export class InvoiceSettingsEntity extends AbstractSettingsEntity {
	public static settingId = 'invoice-numbers';
	public invoiceNumbers!: IncrementNumberBehavior;
	public offerNumbers!: IncrementNumberBehavior;
	public customerNumbers!: IncrementNumberBehavior;
	public offerValidityDays!: number;
	public defaultInvoiceDueDays!: number;
	public defaultInvoiceFooterText!: string;

	/**
	 * Determines the output format for digital invoices.
	 * - PDF: Only PDF is generated
	 * - XRECHNUNG_PDF: Both XRechnung and PDF are generated
	 * - XRECHNUNG: Only XRechnung is generated
	 * - ZUGFERD: ZUGFeRD format is generated
	 *
	 * This setting is used by invoice creation handlers to decide which formats to generate and send.
	 */
	public invoiceOutputFormat: InvoiceOutputFormat = InvoiceOutputFormat.PDF;

	constructor(
		params: Partial<ObjectProperties<InvoiceSettingsEntity>>,
		private saveInner: (data: string) => Promise<void>,
	) {
		super(params, saveInner);
		this.invoiceNumbers = new IncrementNumberBehavior(
			params.invoiceNumbers || {},
			this,
		);
		this.offerNumbers = new IncrementNumberBehavior(
			params.offerNumbers || {},
			this,
		);
		this.customerNumbers = new IncrementNumberBehavior(
			params.customerNumbers || {},
			this,
		);
		this.offerValidityDays = params.offerValidityDays || 14;
		this.defaultInvoiceDueDays = params.defaultInvoiceDueDays || 14;
		this.defaultInvoiceFooterText = params.defaultInvoiceFooterText || '';
		// Accept both string and enum for backward compatibility, but always store as enum
		if (typeof params.invoiceOutputFormat === 'string') {
			this.invoiceOutputFormat =
				InvoiceOutputFormat[
					params.invoiceOutputFormat as keyof typeof InvoiceOutputFormat
				] || InvoiceOutputFormat.PDF;
		} else if (params.invoiceOutputFormat) {
			this.invoiceOutputFormat = params.invoiceOutputFormat;
		} else {
			this.invoiceOutputFormat = InvoiceOutputFormat.PDF;
		}
	}

	public serializable() {
		return {
			invoiceNumbers: this.invoiceNumbers.serializable(),
			offerNumbers: this.offerNumbers.serializable(),
			customerNumbers: this.customerNumbers.serializable(),
			offerValidityDays: this.offerValidityDays,
			defaultInvoiceDueDays: this.defaultInvoiceDueDays,
			defaultInvoiceFooterText: this.defaultInvoiceFooterText,
			// Always serialize as enum value (string)
			invoiceOutputFormat: this.invoiceOutputFormat,
		};
	}

	public async save(): Promise<void> {
		const data = CustomJson.toJson(this.serializable());
		await this.saveInner(data);
	}
}

/**
 * Represents a category for expenses, used for tax and reporting purposes.
 */
export type ExpenseCategory = {
	id: string;
	name: string;
	color?: string;
	isDefault: boolean;
	reference?: string;
	sumForTaxSoftware?: boolean;
	description?: string;
};

/**
 * Stores all expense-related settings, including categories.
 */
export class ExpenseSettingsEntity extends AbstractSettingsEntity {
	public static settingId = 'expense-settings';
	public categories: ExpenseCategory[] = [];

	constructor(
		params: Partial<ObjectProperties<ExpenseSettingsEntity>> = {},
		private saveInner: (data: string) => Promise<void>,
	) {
		super(params, saveInner);
		this.categories = params.categories || [];
	}

	public serializable() {
		return {
			categories: this.categories,
		};
	}

	public async save(): Promise<void> {
		const data = CustomJson.toJson(this.serializable());
		await this.saveInner(data);
	}
}

/**
 * Domain entity for a settings record (for repository usage).
 */
export class SettingsEntity extends DomainEntity {
	/** The unique id for the settings record (e.g. 'invoice-numbers', 'stationary-template'). */
	public settingId!: string;
	/** The settings data, as a string (JSON) or object. */
	public data!: string;

	/**
	 * The unique id for the settings entity (required by DomainEntity).
	 */
	public get id(): string {
		return this.settingId;
	}

	constructor(props: Partial<SettingsEntity>) {
		super();
		Object.assign(this, props);
	}
}

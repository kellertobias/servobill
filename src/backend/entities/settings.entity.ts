/* eslint-disable @typescript-eslint/no-explicit-any */
import { CustomJson } from '@/common/json';
import { Numbering } from '@/common/numbers';
import { ObjectProperties } from '@/common/ts-helpers';

export abstract class AbstractSettingsEntity {
	public async save(): Promise<void> {}
	public static settingId: string;

	constructor(
		params: any,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		saveInner: (data: string) => Promise<void>,
	) {
		Object.assign(this, params);
	}
}

export class PdfTemplateSetting {
	public static settingId = 'stationary-template';
	public pdfTemplate!: string;
	public pdfStyles!: string;
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
	};

	public sendFrom!: string;
	public replyTo!: string;

	constructor(
		params: Partial<ObjectProperties<PdfTemplateSetting>>,
		private saveInner: (data: string) => Promise<void>,
	) {
		Object.assign(this, params);
		if (!this.pdfTemplate) {
			this.pdfTemplate = '';
		}
		if (!this.pdfStyles) {
			this.pdfStyles = '';
		}
		if (!this.emailTemplate) {
			this.emailTemplate = '';
		}
		if (!this.emailSubjectInvoices) {
			this.emailSubjectInvoices = '';
		}
		if (!this.emailSubjectOffers) {
			this.emailSubjectOffers = '';
		}
		if (!this.emailSubjectReminder) {
			this.emailSubjectReminder = '';
		}
		if (!this.emailSubjectWarning) {
			this.emailSubjectWarning = '';
		}
		if (!this.sendFrom) {
			this.sendFrom = '';
		}
		if (!this.replyTo) {
			this.replyTo = '';
		}
		if (!this.invoiceCompanyLogo) {
			this.invoiceCompanyLogo = '';
		}
		if (!this.emailCompanyLogo) {
			this.emailCompanyLogo = '';
		}
		if (!this.companyData) {
			this.companyData = {
				name: '',
				street: '',
				zip: '',
				city: '',
				taxId: '',
				vatId: '',
				email: '',
				phone: '',
				web: '',
				bank: {
					accountHolder: '',
					iban: '',
					bic: '',
				},
			};
		}
	}

	public serializable() {
		return {
			pdfTemplate: this.pdfTemplate,
			pdfStyles: this.pdfStyles,
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
		};
	}

	public save(): Promise<void> {
		const data = CustomJson.toJson(this.serializable());

		return this.saveInner(data);
	}
}

export class IncrementNumberBehavior {
	public template!: string; // e.g. INV-YYMM-XXXX
	public incrementTemplate!: string; // e.g. YY-XXXX
	public lastNumber!: string;

	constructor(
		params: Partial<ObjectProperties<IncrementNumberBehavior>>,
		private parent?: InvoiceSettingsEntity,
	) {
		Object.assign(this, params);
		if (!this.template) {
			this.template = '';
		}
		if (!this.incrementTemplate) {
			this.incrementTemplate = '';
		}
		if (!this.lastNumber) {
			this.lastNumber = '';
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

export class InvoiceSettingsEntity {
	public static settingId = 'invoice-numbers';
	public invoiceNumbers!: IncrementNumberBehavior;
	public offerNumbers!: IncrementNumberBehavior;
	public customerNumbers!: IncrementNumberBehavior;
	public offerValidityDays!: number;
	public defaultInvoiceDueDays!: number;
	public defaultInvoiceFooterText!: string;

	constructor(
		params: Partial<ObjectProperties<InvoiceSettingsEntity>>,
		private saveInner: (data: string) => Promise<void>,
	) {
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
	}

	public serializable() {
		return {
			invoiceNumbers: this.invoiceNumbers.serializable(),
			offerNumbers: this.offerNumbers.serializable(),
			customerNumbers: this.customerNumbers.serializable(),
			offerValidityDays: this.offerValidityDays,
			defaultInvoiceDueDays: this.defaultInvoiceDueDays,
			defaultInvoiceFooterText: this.defaultInvoiceFooterText,
		};
	}

	public async save(): Promise<void> {
		const data = CustomJson.toJson(this.serializable());
		await this.saveInner(data);
	}
}

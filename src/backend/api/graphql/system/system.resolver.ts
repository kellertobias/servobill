import { Query, Resolver, Authorized, Mutation, Arg } from 'type-graphql';
import dayjs from 'dayjs';

import {
	InvoiceTemplateInput,
	InvoiceTemplateResult,
	SettingsInput,
	SettingsResult,
} from './system.schema';

import { Inject, Service } from '@/common/di';
import { SettingsRepository } from '@/backend/repositories/settings.repository';
import {
	InvoiceSettingsEntity,
	PdfTemplateSetting,
} from '@/backend/entities/settings.entity';
import { EventBusService } from '@/backend/services/eventbus.service';
import { S3Service } from '@/backend/services/s3.service';
import { GenerateTemplatePreviewEvent } from '@/backend/events/template/event';

@Service()
@Resolver()
export class SystemResolver {
	constructor(
		@Inject(SettingsRepository) private repository: SettingsRepository,
		@Inject(EventBusService) private eventBus: EventBusService,
		@Inject(S3Service) private s3: S3Service,
	) {}

	private mapInvoiceSettingsEntityToResponse(
		data: InvoiceSettingsEntity,
		emails: PdfTemplateSetting,
	): SettingsResult {
		return {
			invoiceNumbersTemplate: data.invoiceNumbers.template || '',
			invoiceNumbersIncrementTemplate:
				data.invoiceNumbers.incrementTemplate || '',
			invoiceNumbersLast: data.invoiceNumbers.lastNumber || '',
			offerNumbersTemplate: data.offerNumbers.template || '',
			offerNumbersIncrementTemplate: data.offerNumbers.incrementTemplate || '',
			offerNumbersLast: data.offerNumbers.lastNumber || '',
			customerNumbersTemplate: data.customerNumbers.template || '',
			customerNumbersIncrementTemplate:
				data.customerNumbers.incrementTemplate || '',
			customerNumbersLast: data.customerNumbers.lastNumber || '',
			emailTemplate: emails.emailTemplate || '',
			emailSubjectInvoices: emails.emailSubjectInvoices || '',
			emailSubjectOffers: emails.emailSubjectOffers || '',
			emailSubjectReminder: emails.emailSubjectReminder || '',
			emailSubjectWarning: emails.emailSubjectWarning || '',
			sendFrom: emails.sendFrom || '',
			replyTo: emails.replyTo || '',
			invoiceCompanyLogo: emails.invoiceCompanyLogo || '',
			emailCompanyLogo: emails.emailCompanyLogo || '',
			offerValidityDays: data.offerValidityDays || 0,
			defaultInvoiceDueDays: data.defaultInvoiceDueDays || 0,
			defaultInvoiceFooterText: data.defaultInvoiceFooterText || '',
			company: {
				name: emails.companyData.name || '',
				street: emails.companyData.street || '',
				zip: emails.companyData.zip || '',
				city: emails.companyData.city || '',
				phone: emails.companyData.phone || '',
				email: emails.companyData.email || '',
				web: emails.companyData.web || '',
				vatId: emails.companyData.vatId || '',
				taxId: emails.companyData.taxId || '',
				bankAccountHolder: emails.companyData.bank.accountHolder || '',
				bankIban: emails.companyData.bank.iban || '',
				bankBic: emails.companyData.bank.bic || '',
			},
		};
	}

	@Authorized()
	@Query(() => SettingsResult)
	async settings(): Promise<SettingsResult> {
		const data = await this.repository.getSetting(InvoiceSettingsEntity);
		const emails = await this.repository.getSetting(PdfTemplateSetting);
		return this.mapInvoiceSettingsEntityToResponse(data, emails);
	}

	@Authorized()
	@Query(() => InvoiceTemplateResult)
	async template(): Promise<InvoiceTemplateResult> {
		const emails = await this.repository.getSetting(PdfTemplateSetting);
		return {
			pdfTemplate: emails.pdfTemplate || '',
			pdfStyles: emails.pdfStyles || '',
		};
	}

	@Authorized()
	@Mutation(() => SettingsResult)
	async updateSettings(
		@Arg('data', () => SettingsInput) nextData: SettingsInput,
	): Promise<SettingsResult> {
		const data = await this.repository.getSetting(InvoiceSettingsEntity);
		const emails = await this.repository.getSetting(PdfTemplateSetting);

		data.invoiceNumbers.update({
			template: nextData.invoiceNumbersTemplate,
			incrementTemplate: nextData.invoiceNumbersIncrementTemplate,
			lastNumber: nextData.invoiceNumbersLast,
		});

		data.offerNumbers.update({
			template: nextData.offerNumbersTemplate,
			incrementTemplate: nextData.offerNumbersIncrementTemplate,
			lastNumber: nextData.offerNumbersLast,
		});

		data.customerNumbers.update({
			template: nextData.customerNumbersTemplate,
			incrementTemplate: nextData.customerNumbersIncrementTemplate,
			lastNumber: nextData.customerNumbersLast,
		});

		data.offerValidityDays = nextData.offerValidityDays;
		data.defaultInvoiceDueDays = nextData.defaultInvoiceDueDays;
		data.defaultInvoiceFooterText = nextData.defaultInvoiceFooterText;

		await data.save();

		emails.emailTemplate = nextData.emailTemplate;
		emails.emailSubjectInvoices = nextData.emailSubjectInvoices;
		emails.emailSubjectOffers = nextData.emailSubjectOffers;
		emails.emailSubjectReminder = nextData.emailSubjectReminder;
		emails.emailSubjectWarning = nextData.emailSubjectWarning;

		emails.sendFrom = nextData.sendFrom;
		emails.replyTo = nextData.replyTo;

		emails.invoiceCompanyLogo = nextData.invoiceCompanyLogo;
		emails.emailCompanyLogo = nextData.emailCompanyLogo;

		emails.companyData.name = nextData.company.name;
		emails.companyData.street = nextData.company.street;
		emails.companyData.zip = nextData.company.zip;
		emails.companyData.city = nextData.company.city;
		emails.companyData.phone = nextData.company.phone;
		emails.companyData.email = nextData.company.email;
		emails.companyData.web = nextData.company.web;
		emails.companyData.vatId = nextData.company.vatId;
		emails.companyData.taxId = nextData.company.taxId;
		emails.companyData.bank.accountHolder = nextData.company.bankAccountHolder;
		emails.companyData.bank.iban = nextData.company.bankIban;
		emails.companyData.bank.bic = nextData.company.bankBic;

		await emails.save();

		return this.mapInvoiceSettingsEntityToResponse(data, emails);
	}

	@Authorized()
	@Mutation(() => InvoiceTemplateResult)
	async updateTemplate(
		@Arg('data', () => InvoiceTemplateInput) nextData: InvoiceTemplateInput,
	): Promise<InvoiceTemplateResult> {
		const emails = await this.repository.getSetting(PdfTemplateSetting);

		emails.pdfTemplate = nextData.pdfTemplate;
		emails.pdfStyles = nextData.pdfStyles;

		await emails.save();

		return {
			pdfTemplate: emails.pdfTemplate || '',
			pdfStyles: emails.pdfStyles || '',
		};
	}

	@Authorized()
	@Mutation(() => String)
	async testRenderTemplate(
		@Arg('template', () => String) template: string,
		@Arg('styles', () => String) styles: string,
		@Arg('pdf', () => Boolean, { nullable: true }) pdf?: boolean,
	): Promise<string> {
		const numbers = await this.repository.getSetting(InvoiceSettingsEntity);
		const emails = await this.repository.getSetting(PdfTemplateSetting);

		const key = `template-tests/${dayjs().format('YYMMDD-HHmmss')}.${
			pdf ? 'pdf' : 'html'
		}`;

		this.eventBus.send(
			'template',
			new GenerateTemplatePreviewEvent({
				pdf: pdf || false,
				template,
				styles,
				key,
				data: {
					logo: emails.invoiceCompanyLogo,
					company: emails.companyData,
					invoiceNumber: numbers.invoiceNumbers.lastNumber,
					offerNumber: numbers.offerNumbers.lastNumber,
					customerNumber: numbers.customerNumbers.lastNumber,
				},
			}),
		);

		const url = await this.s3.getSignedUrl({
			key,
		});

		return url;
	}

	@Authorized()
	@Mutation(() => String)
	async sendTestEvent(
		@Arg('name', () => String) name: string,
		@Arg('data', () => String) data: string,
	): Promise<string | undefined> {
		const eventId = await this.eventBus.send(name, JSON.parse(data));
		return eventId;
	}
}

import { randomUUID } from 'node:crypto';

import { Query, Resolver, Authorized, Mutation, Arg } from 'type-graphql';
import dayjs from 'dayjs';

import { GRAPHQL_TEST_SET } from '../di-tokens';

import {
	ExpenseCategoryInputType,
	ExpenseCategoryType,
	InvoiceTemplateInput,
	InvoiceTemplateResult,
	SettingsInput,
	SettingsResult,
} from './system.schema';

import { Inject, Service } from '@/common/di';
import { SETTINGS_REPOSITORY } from '@/backend/repositories/settings/di-tokens';
import { type SettingsRepository } from '@/backend/repositories/settings/interface';
import {
	InvoiceSettingsEntity,
	PdfTemplateSetting,
	CompanyDataSetting,
	ExpenseSettingsEntity,
	InvoiceOutputFormat,
} from '@/backend/entities/settings.entity';
import type { EventBusService } from '@/backend/services/eventbus.service';
import { GenerateTemplatePreviewEvent } from '@/backend/events/template/event';
import {
	FILE_STORAGE_SERVICE,
	type FileStorageService,
} from '@/backend/services/file-storage.service';
import {
	EXPENSE_REPOSITORY,
	type ExpenseRepository,
} from '@/backend/repositories/expense';
import { EVENTBUS_SERVICE } from '@/backend/services/di-tokens';

@Service({
	addToTestSet: [GRAPHQL_TEST_SET],
})
@Resolver()
export class SystemResolver {
	constructor(
		@Inject(SETTINGS_REPOSITORY) private settingsRepository: SettingsRepository,
		@Inject(EXPENSE_REPOSITORY) private expenseRepository: ExpenseRepository,
		@Inject(EVENTBUS_SERVICE) private eventBus: EventBusService,
		@Inject(FILE_STORAGE_SERVICE)
		private fileStorageService: FileStorageService,
	) {}

	/**
	 * Maps the InvoiceSettingsEntity and related entities to the GraphQL SettingsResult type.
	 * Ensures the invoiceOutputFormat is included in the response.
	 */
	private mapInvoiceSettingsEntityToResponse({
		invoices,
		company,
		expenses,
	}: {
		invoices: InvoiceSettingsEntity;
		company: CompanyDataSetting;
		expenses?: ExpenseSettingsEntity;
	}): SettingsResult {
		return {
			// Data from company:
			company: {
				name: company.companyData.name || '',
				street: company.companyData.street || '',
				zip: company.companyData.zip || '',
				city: company.companyData.city || '',
				phone: company.companyData.phone || '',
				email: company.companyData.email || '',
				web: company.companyData.web || '',
				vatId: company.companyData.vatId || '',
				taxId: company.companyData.taxId || '',
				bankAccountHolder: company.companyData.bank.accountHolder || '',
				bankIban: company.companyData.bank.iban || '',
				bankBic: company.companyData.bank.bic || '',
				vatStatus: company.vatStatus,
			},
			sendFrom: company.sendFrom || '',
			replyTo: company.replyTo || '',

			// will move into separate setting entity later, currently in company data
			emailTemplate: company.emailTemplate || '',
			emailSubjectInvoices: company.emailSubjectInvoices || '',
			emailSubjectOffers: company.emailSubjectOffers || '',
			emailSubjectReminder: company.emailSubjectReminder || '',
			emailSubjectWarning: company.emailSubjectWarning || '',
			invoiceCompanyLogo: company.invoiceCompanyLogo || '',
			emailCompanyLogo: company.emailCompanyLogo || '',

			// invoice and order settings
			invoiceNumbersTemplate: invoices.invoiceNumbers.template || '',
			invoiceNumbersIncrementTemplate:
				invoices.invoiceNumbers.incrementTemplate || '',
			invoiceNumbersLast: invoices.invoiceNumbers.lastNumber || '',
			offerNumbersTemplate: invoices.offerNumbers.template || '',
			offerNumbersIncrementTemplate:
				invoices.offerNumbers.incrementTemplate || '',
			offerNumbersLast: invoices.offerNumbers.lastNumber || '',
			customerNumbersTemplate: invoices.customerNumbers.template || '',
			customerNumbersIncrementTemplate:
				invoices.customerNumbers.incrementTemplate || '',
			customerNumbersLast: invoices.customerNumbers.lastNumber || '',
			offerValidityDays: invoices.offerValidityDays || 0,
			defaultInvoiceDueDays: invoices.defaultInvoiceDueDays || 0,
			defaultInvoiceFooterText: invoices.defaultInvoiceFooterText || '',

			// expenses
			categories: expenses
				? (expenses.categories || []).map((cat) => ({ ...cat }))
				: undefined,
			currency: company.currency || 'EUR',
			invoiceOutputFormat: invoices.invoiceOutputFormat as
				| InvoiceOutputFormat
				| undefined,
		};
	}

	@Authorized()
	@Query(() => SettingsResult)
	async settings(): Promise<SettingsResult> {
		const invoices = await this.settingsRepository.getSetting(
			InvoiceSettingsEntity,
		);
		const company =
			await this.settingsRepository.getSetting(CompanyDataSetting);

		const expenses = await this.settingsRepository.getSetting(
			ExpenseSettingsEntity,
		);

		return this.mapInvoiceSettingsEntityToResponse({
			company,
			invoices,
			expenses,
		});
	}

	@Authorized()
	@Query(() => InvoiceTemplateResult)
	async template(): Promise<InvoiceTemplateResult> {
		const emails = await this.settingsRepository.getSetting(PdfTemplateSetting);
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
		const genericSettings = await this.settingsRepository.getSetting(
			InvoiceSettingsEntity,
		);

		genericSettings.invoiceNumbers.update({
			template: nextData.invoiceNumbersTemplate,
			incrementTemplate: nextData.invoiceNumbersIncrementTemplate,
			lastNumber: nextData.invoiceNumbersLast,
		});

		genericSettings.offerNumbers.update({
			template: nextData.offerNumbersTemplate,
			incrementTemplate: nextData.offerNumbersIncrementTemplate,
			lastNumber: nextData.offerNumbersLast,
		});

		genericSettings.customerNumbers.update({
			template: nextData.customerNumbersTemplate,
			incrementTemplate: nextData.customerNumbersIncrementTemplate,
			lastNumber: nextData.customerNumbersLast,
		});

		genericSettings.offerValidityDays = nextData.offerValidityDays || 14;
		genericSettings.defaultInvoiceDueDays =
			nextData.defaultInvoiceDueDays || 28;
		genericSettings.defaultInvoiceFooterText =
			nextData.defaultInvoiceFooterText || 'Created by Servobill';

		// Set the invoice output format if provided, otherwise keep current or default
		if (nextData.invoiceOutputFormat) {
			genericSettings.invoiceOutputFormat = nextData.invoiceOutputFormat;
		}

		await genericSettings.save();

		const companyData =
			await this.settingsRepository.getSetting(CompanyDataSetting);

		companyData.emailTemplate = nextData.emailTemplate || '';
		companyData.emailSubjectInvoices =
			nextData.emailSubjectInvoices || 'Here is your invoice {{number}}';
		companyData.emailSubjectOffers =
			nextData.emailSubjectOffers || 'Your offer {{number}} is ready';
		companyData.emailSubjectReminder =
			nextData.emailSubjectReminder || 'Reminder: Invoice {{number}} is due';
		companyData.emailSubjectWarning =
			nextData.emailSubjectWarning || 'Warning: Invoice {{number}} is over due';

		companyData.sendFrom = nextData.sendFrom || 'no-reply@example.com';
		companyData.replyTo = nextData.replyTo || 'no-reply@example.com';

		companyData.invoiceCompanyLogo = nextData.invoiceCompanyLogo || '';
		companyData.emailCompanyLogo = nextData.emailCompanyLogo || '';

		companyData.companyData.name = nextData.company?.name || '';
		companyData.companyData.street = nextData.company?.street || '';
		companyData.companyData.zip = nextData.company?.zip || '';
		companyData.companyData.city = nextData.company?.city || '';
		companyData.companyData.phone = nextData.company?.phone || '';
		companyData.companyData.email = nextData.company?.email || '';
		companyData.companyData.web = nextData.company?.web || '';
		companyData.companyData.vatId = nextData.company?.vatId || '';
		companyData.companyData.taxId = nextData.company?.taxId || '';
		companyData.companyData.bank.accountHolder =
			nextData.company?.bankAccountHolder || '';
		companyData.companyData.bank.iban = nextData.company?.bankIban || '';
		companyData.companyData.bank.bic = nextData.company?.bankBic || '';

		if (nextData.currency) {
			companyData.currency = nextData.currency;
		}

		if (nextData.company?.vatStatus) {
			companyData.vatStatus = nextData.company.vatStatus;
		}

		await companyData.save();

		return this.mapInvoiceSettingsEntityToResponse({
			company: companyData,
			invoices: genericSettings,
		});
	}

	@Authorized()
	@Mutation(() => InvoiceTemplateResult)
	async updateTemplate(
		@Arg('data', () => InvoiceTemplateInput) nextData: InvoiceTemplateInput,
	): Promise<InvoiceTemplateResult> {
		const template =
			await this.settingsRepository.getSetting(PdfTemplateSetting);

		template.pdfTemplate = nextData.pdfTemplate;
		template.pdfStyles = nextData.pdfStyles;

		await template.save();

		return {
			pdfTemplate: template.pdfTemplate || '',
			pdfStyles: template.pdfStyles || '',
		};
	}

	@Authorized()
	@Mutation(() => [ExpenseCategoryType])
	async updateExpenseSettings(
		@Arg('categories', () => [ExpenseCategoryInputType])
		categories: ExpenseCategoryInputType[],
		@Arg('fixExpensesForImport', () => Boolean, { nullable: true })
		fixExpensesForImport?: boolean,
	): Promise<ExpenseCategoryType[]> {
		if (fixExpensesForImport && categories.length === 0) {
			return [];
		}

		const expenseSettings = await this.settingsRepository.getSetting(
			ExpenseSettingsEntity,
		);

		// this happens in two steps, so that we do not get client generated
		// ids for the categories.
		// update existing entries, match by categoryId
		const existingCategories = expenseSettings.categories;
		expenseSettings.categories = [];
		const existingCategoryIds = new Set<string>();
		for (const category of existingCategories) {
			const updatedCategory = categories.find(
				(cat) => cat.categoryId === category.id,
			);
			if (!updatedCategory) {
				continue;
			}

			existingCategoryIds.add(category.id);
			expenseSettings.categories.push({
				...category,
				...updatedCategory,
			});
			// the ones that are not in the updatedCategories, get deleted
			// since they are not in the new array.
		}

		// now create the new categories
		const newCategories = categories.filter(
			(cat) => !existingCategoryIds.has(cat.categoryId || ''),
		);

		const categoryMap: Record<string, string> = {};

		for (const category of newCategories) {
			// Generate a single UUID for the new category.
			const id = randomUUID();
			// Map the client-side categoryId (if present) to the new server-generated ID.
			if (category.categoryId) {
				categoryMap[category.categoryId] = id;
			}
			// If a category with the same name (and color) exists, map its old server-generated ID to the new one.
			const oldCategory = existingCategories.find(
				(cat) => cat.name === category.name && cat.color === category.color,
			);
			if (oldCategory) {
				categoryMap[oldCategory.id] = id;
			}
			expenseSettings.categories.push({
				...category,
				id, // Use the same UUID for the category's id
				isDefault: category.isDefault || false,
				sumForTaxSoftware: category.sumForTaxSoftware || false,
			});
		}

		if (fixExpensesForImport) {
			// if we are importing expense categories,
			// since we do not allow client sided IDs,
			// we now need to re-map the categories of already
			// imported expenses.
			const expenses = await this.expenseRepository.listByQuery({});

			for (const expense of expenses) {
				const categoryId = expense.categoryId;
				if (categoryId && categoryMap[categoryId]) {
					expense.categoryId = categoryMap[categoryId];
					await this.expenseRepository.save(expense);
				}
			}
		}

		await expenseSettings.save();
		return expenseSettings.categories;
	}

	@Authorized()
	@Mutation(() => String)
	async testRenderTemplate(
		@Arg('template', () => String) template: string,
		@Arg('styles', () => String) styles: string,
		@Arg('pdf', () => Boolean, { nullable: true }) pdf?: boolean,
	): Promise<string> {
		const numbers = await this.settingsRepository.getSetting(
			InvoiceSettingsEntity,
		);
		const companyData =
			await this.settingsRepository.getSetting(CompanyDataSetting);

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
					logo: companyData.invoiceCompanyLogo,
					company: companyData.companyData,
					invoiceNumber: numbers.invoiceNumbers.lastNumber,
					offerNumber: numbers.offerNumbers.lastNumber,
					customerNumber: numbers.customerNumbers.lastNumber,
				},
			}),
		);

		const url = await this.fileStorageService.getDownloadUrl({ key });

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

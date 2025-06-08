import { randomUUID } from 'node:crypto';

import { Query, Resolver, Authorized, Mutation, Arg } from 'type-graphql';
import dayjs from 'dayjs';

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
	ExpenseSettingsEntity,
} from '@/backend/entities/settings.entity';
import { EventBusService } from '@/backend/services/eventbus.service';
import { GenerateTemplatePreviewEvent } from '@/backend/events/template/event';
import {
	FILE_STORAGE_SERVICE,
	type FileStorageService,
} from '@/backend/services/file-storage.service';
import {
	EXPENSE_REPOSITORY,
	type ExpenseRepository,
} from '@/backend/repositories/expense';

@Service()
@Resolver()
export class SystemResolver {
	constructor(
		@Inject(SETTINGS_REPOSITORY) private settingsRepository: SettingsRepository,
		@Inject(EXPENSE_REPOSITORY) private expenseRepository: ExpenseRepository,
		@Inject(EventBusService) private eventBus: EventBusService,
		@Inject(FILE_STORAGE_SERVICE)
		private fileStorageService: FileStorageService,
	) {}

	private mapInvoiceSettingsEntityToResponse(
		data: InvoiceSettingsEntity,
		emails: PdfTemplateSetting,
		expenseSettings?: ExpenseSettingsEntity,
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
			categories: expenseSettings
				? (expenseSettings.categories || []).map((cat) => ({ ...cat }))
				: undefined,
		};
	}

	@Authorized()
	@Query(() => SettingsResult)
	async settings(): Promise<SettingsResult> {
		const data = await this.settingsRepository.getSetting(
			InvoiceSettingsEntity,
		);
		const emails = await this.settingsRepository.getSetting(PdfTemplateSetting);
		const expenseSettings = await this.settingsRepository.getSetting(
			ExpenseSettingsEntity,
		);
		return this.mapInvoiceSettingsEntityToResponse(
			data,
			emails,
			expenseSettings,
		);
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
		console.log('nextData', nextData);
		console.log('nextData.company', nextData.company);

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

		await genericSettings.save();

		const emailSettings =
			await this.settingsRepository.getSetting(PdfTemplateSetting);

		emailSettings.emailTemplate = nextData.emailTemplate || '';
		emailSettings.emailSubjectInvoices =
			nextData.emailSubjectInvoices || 'Here is your invoice {{number}}';
		emailSettings.emailSubjectOffers =
			nextData.emailSubjectOffers || 'Your offer {{number}} is ready';
		emailSettings.emailSubjectReminder =
			nextData.emailSubjectReminder || 'Reminder: Invoice {{number}} is due';
		emailSettings.emailSubjectWarning =
			nextData.emailSubjectWarning || 'Warning: Invoice {{number}} is over due';

		emailSettings.sendFrom = nextData.sendFrom || 'no-reply@example.com';
		emailSettings.replyTo = nextData.replyTo || 'no-reply@example.com';

		emailSettings.invoiceCompanyLogo = nextData.invoiceCompanyLogo || '';
		emailSettings.emailCompanyLogo = nextData.emailCompanyLogo || '';

		emailSettings.companyData.name = nextData.company?.name || '';
		emailSettings.companyData.street = nextData.company?.street || '';
		emailSettings.companyData.zip = nextData.company?.zip || '';
		emailSettings.companyData.city = nextData.company?.city || '';
		emailSettings.companyData.phone = nextData.company?.phone || '';
		emailSettings.companyData.email = nextData.company?.email || '';
		emailSettings.companyData.web = nextData.company?.web || '';
		emailSettings.companyData.vatId = nextData.company?.vatId || '';
		emailSettings.companyData.taxId = nextData.company?.taxId || '';
		emailSettings.companyData.bank.accountHolder =
			nextData.company?.bankAccountHolder || '';
		emailSettings.companyData.bank.iban = nextData.company?.bankIban || '';
		emailSettings.companyData.bank.bic = nextData.company?.bankBic || '';

		await emailSettings.save();

		return this.mapInvoiceSettingsEntityToResponse(
			genericSettings,
			emailSettings,
		);
	}

	@Authorized()
	@Mutation(() => InvoiceTemplateResult)
	async updateTemplate(
		@Arg('data', () => InvoiceTemplateInput) nextData: InvoiceTemplateInput,
	): Promise<InvoiceTemplateResult> {
		const emails = await this.settingsRepository.getSetting(PdfTemplateSetting);

		emails.pdfTemplate = nextData.pdfTemplate;
		emails.pdfStyles = nextData.pdfStyles;

		await emails.save();

		return {
			pdfTemplate: emails.pdfTemplate || '',
			pdfStyles: emails.pdfStyles || '',
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
			const id = randomUUID();
			categoryMap[category.categoryId || ''] = id;
			expenseSettings.categories.push({
				...category,
				id: randomUUID(),
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
		const emails = await this.settingsRepository.getSetting(PdfTemplateSetting);

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

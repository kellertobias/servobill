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
	CompanyDataSetting,
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
		companyData: CompanyDataSetting,
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
			emailTemplate: companyData.emailTemplate || '',
			emailSubjectInvoices: companyData.emailSubjectInvoices || '',
			emailSubjectOffers: companyData.emailSubjectOffers || '',
			emailSubjectReminder: companyData.emailSubjectReminder || '',
			emailSubjectWarning: companyData.emailSubjectWarning || '',
			sendFrom: companyData.sendFrom || '',
			replyTo: companyData.replyTo || '',
			invoiceCompanyLogo: companyData.invoiceCompanyLogo || '',
			emailCompanyLogo: companyData.emailCompanyLogo || '',
			offerValidityDays: data.offerValidityDays || 0,
			defaultInvoiceDueDays: data.defaultInvoiceDueDays || 0,
			defaultInvoiceFooterText: data.defaultInvoiceFooterText || '',
			company: {
				name: companyData.companyData.name || '',
				street: companyData.companyData.street || '',
				zip: companyData.companyData.zip || '',
				city: companyData.companyData.city || '',
				phone: companyData.companyData.phone || '',
				email: companyData.companyData.email || '',
				web: companyData.companyData.web || '',
				vatId: companyData.companyData.vatId || '',
				taxId: companyData.companyData.taxId || '',
				bankAccountHolder: companyData.companyData.bank.accountHolder || '',
				bankIban: companyData.companyData.bank.iban || '',
				bankBic: companyData.companyData.bank.bic || '',
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
		const companyData =
			await this.settingsRepository.getSetting(CompanyDataSetting);
		const expenseSettings = await this.settingsRepository.getSetting(
			ExpenseSettingsEntity,
		);
		return this.mapInvoiceSettingsEntityToResponse(
			data,
			companyData,
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

		console.log('genericSettings', genericSettings);

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

		console.log('companyData', companyData);
		await companyData.save();

		return this.mapInvoiceSettingsEntityToResponse(
			genericSettings,
			companyData,
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
		if (fixExpensesForImport && !categories.length) {
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

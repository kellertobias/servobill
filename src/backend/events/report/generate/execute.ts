import dayjs from 'dayjs';
import type { IncomeSurplusReport } from '@/backend/api/graphql/reports/reports.schema';

import { CreatePdfCommand } from '@/backend/cqrs/generate-pdf/create-pdf.command';
import { CreatePdfHandler } from '@/backend/cqrs/generate-pdf/create-pdf.handler';
import { GenerateReportHtmlCommand } from '@/backend/cqrs/generate-report-html/generate-report-html.command';
import { GenerateReportHtmlHandler } from '@/backend/cqrs/generate-report-html/generate-report-html.handler';
import {
	type InvoiceEntity,
	InvoiceStatus,
	InvoiceType,
} from '@/backend/entities/invoice.entity';
import {
	CompanyDataSetting,
	ExpenseSettingsEntity,
} from '@/backend/entities/settings.entity';
import {
	EXPENSE_REPOSITORY,
	type ExpenseRepository,
	INVOICE_REPOSITORY,
	type InvoiceRepository,
	SETTINGS_REPOSITORY,
	type SettingsRepository,
} from '@/backend/repositories';
import type { ConfigService } from '@/backend/services/config.service';
import { CqrsBus } from '@/backend/services/cqrs.service';
import { CONFIG_SERVICE } from '@/backend/services/di-tokens';
import { Logger } from '@/backend/services/logger.service';
import type { ReportItem } from '@/backend/services/report-generator/report-html-generator';
import { SESService } from '@/backend/services/ses.service';
import { DefaultContainer, Inject, Service } from '@/common/di';
import type { ReportGenerateEvent } from './event';
import {
	BASE_CSS,
	CATEGORIZED_TEMPLATE,
	EMAIL_TEMPLATE,
	SIMPLE_TEMPLATE,
} from './templates';

@Service()
export class ReportGenerateHandlerExecution {
	private readonly logger = new Logger('ReportGenerateHandlerExecution');
	private cqrsBus: CqrsBus;

	constructor(
		@Inject(INVOICE_REPOSITORY)
		private readonly invoiceRepository: InvoiceRepository,
		@Inject(EXPENSE_REPOSITORY)
		private readonly expenseRepository: ExpenseRepository,
		@Inject(SETTINGS_REPOSITORY)
		private readonly settingsRepository: SettingsRepository,
		@Inject(CONFIG_SERVICE) readonly _config: ConfigService,
		@Inject(SESService)
		private readonly sesService: SESService,
	) {
		this.cqrsBus = CqrsBus.forRoot({
			handlers: [GenerateReportHtmlHandler, CreatePdfHandler],
			container: DefaultContainer,
		});
	}

	// --- Data Fetching Logic (Replicated from ReportsResolver) ---
	private async getRelevantData(
		startDate: Date,
		endDate: Date,
	): Promise<{ invoices: InvoiceEntity[]; expenses: any[] }> {
		// Using any for expenses as Entity import might be tricky if not exported or different file
		// Need to verify ExpenseEntity import or just use what repositories return
		const startYear = dayjs(startDate).year();
		const invoices = await this.invoiceRepository
			.listByQuery({
				where: { year: startYear },
			})
			.then((results) =>
				results.filter(
					(invoice) =>
						invoice.type === InvoiceType.INVOICE &&
						dayjs(invoice.invoicedAt).isAfter(startDate) &&
						dayjs(invoice.invoicedAt).isBefore(endDate) &&
						[
							InvoiceStatus.PAID,
							InvoiceStatus.PAID_PARTIALLY,
							InvoiceStatus.SENT,
						].includes(invoice.status),
				),
			);

		const expenses = await this.expenseRepository
			.listByQuery({
				where: { year: startYear },
			})
			.then((results) =>
				results.filter(
					(expense) =>
						dayjs(expense.expendedAt).isAfter(startDate) &&
						dayjs(expense.expendedAt).isBefore(endDate),
				),
			);

		return { invoices, expenses };
	}

	private async getReportData(startDate: Date, endDate: Date) {
		const { invoices, expenses } = await this.getRelevantData(
			startDate,
			endDate,
		);
		const bookings: ReportItem[] = [];

		invoices.forEach((invoice) => {
			if (!invoice.invoicedAt) {
				return;
			}
			bookings.push({
				id: invoice.id,
				type: 'invoice',
				name: `${invoice.invoiceNumber}`,
				valutaDate: invoice.invoicedAt,
				surplusCents: invoice.totalCents,
				taxCents: invoice.totalTax,
				category: {
					id: 'invoice',
					name: 'Income',
					color: '#000',
					description: 'Income',
				},
			});
		});

		const settings = await this.settingsRepository.getSetting(
			ExpenseSettingsEntity,
		);

		expenses.forEach((expense) => {
			const category = settings.categories.find(
				(cat) => cat.id === expense.categoryId,
			);
			bookings.push({
				id: expense.id,
				type: 'expense',
				name: `${expense.name}`,
				description: expense.description,
				valutaDate: expense.expendedAt,
				surplusCents: -1 * expense.expendedCents,
				taxCents: -1 * (expense.taxCents || 0),
				category: category ? { ...category } : undefined,
			});
		});

		// Calculate totals
		let incomeCents = 0;
		let expensesCents = 0;
		let surplusCents = 0;
		let invoiceTaxCents = 0;
		let expensesTaxCents = 0;
		const overdueCents = 0;
		const overdueInvoices = 0;
		const openCents = 0;
		const openInvoices = 0;

		for (const booking of bookings) {
			if (booking.type === 'invoice') {
				surplusCents += booking.surplusCents;
				incomeCents += booking.surplusCents;
				invoiceTaxCents += booking.taxCents || 0;
			} else if (booking.type === 'expense') {
				surplusCents += booking.surplusCents;
				expensesCents -= booking.surplusCents; // expensesCents should be positive representation of expense
				expensesTaxCents -= booking.taxCents || 0;
			}
		}

		return {
			incomeCents,
			expensesCents,
			surplusCents,
			invoiceTaxCents,
			expensesTaxCents,
			overdueCents,
			overdueInvoices,
			openCents,
			openInvoices,
			items: bookings,
			startDate,
			endDate,
		};
	}

	async execute(event: ReportGenerateEvent) {
		this.logger.info('Starting report generation', { ...event });

		const startDate = dayjs(event.start).toDate();
		const endDate = dayjs(event.end).toDate();

		// 1. Fetch Data
		const reportData = await this.getReportData(startDate, endDate);

		// 1b. Fetch Company Settings
		const companySettings =
			await this.settingsRepository.getSetting(CompanyDataSetting);

		// 2. Generate HTML
		const template =
			event.format === 'PLAIN' ? SIMPLE_TEMPLATE : CATEGORIZED_TEMPLATE;

		const { html } = await this.cqrsBus.execute(
			new GenerateReportHtmlCommand({
				title:
					event.format === 'PLAIN'
						? 'Financial Report'
						: 'Financial Report (Categorized)',
				report: reportData as IncomeSurplusReport,
				company: companySettings.companyData,
				template,
				styles: BASE_CSS,
			}),
		);

		// 3. Generate PDF
		const { pdf: pdfBuffer } = await this.cqrsBus.execute(
			new CreatePdfCommand({
				html,
				key: `reports/${dayjs(startDate).format('YYYY')}/Report_${dayjs(startDate).format('YYYYMMDD')}-${dayjs(endDate).format('YYYYMMDD')}.pdf`,
			}),
		);

		// 4. Send Email
		await this.sesService.sendEmail({
			to: event.recipientEmail,
			from: companySettings.sendFrom,
			subject: `Your Financial Report (${dayjs(startDate).format('YYYY-MM-DD')} - ${dayjs(endDate).format('YYYY-MM-DD')})`,
			html: EMAIL_TEMPLATE.replace('{{format}}', event.format)
				.replace('{{startDate}}', dayjs(startDate).format('DD.MM.YYYY'))
				.replace('{{endDate}}', dayjs(endDate).format('DD.MM.YYYY')),
			attachments: [
				{
					filename: `Report_${dayjs(startDate).format('YYYYMMDD')}-${dayjs(endDate).format('YYYYMMDD')}.pdf`,
					content: pdfBuffer,
				},
			],
		});

		this.logger.info('Report sent successfully', {
			email: event.recipientEmail,
		});
	}
}

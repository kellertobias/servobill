/* eslint-disable @typescript-eslint/no-unused-vars */

import dayjs from 'dayjs';
import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import type { ExpenseEntity } from '@/backend/entities/expense.entity';
import {
	type InvoiceEntity,
	InvoiceStatus,
	InvoiceType,
} from '@/backend/entities/invoice.entity';
import { ReportFormat } from '@/backend/entities/report.entity';
import { ExpenseSettingsEntity } from '@/backend/entities/settings.entity';
import { EXPENSE_REPOSITORY } from '@/backend/repositories/expense/di-tokens';
import type { ExpenseRepository } from '@/backend/repositories/expense/interface';
import { INVOICE_REPOSITORY } from '@/backend/repositories/invoice/di-tokens';
import type { InvoiceRepository } from '@/backend/repositories/invoice/interface';
import { SETTINGS_REPOSITORY } from '@/backend/repositories/settings/di-tokens';
import type { SettingsRepository } from '@/backend/repositories/settings/interface';
import { EVENTBUS_SERVICE } from '@/backend/services/di-tokens';
import type { EventBusService } from '@/backend/services/eventbus.service';
import { Inject, Service } from '@/common/di';
import { GRAPHQL_TEST_SET } from '../di-tokens';
import {
	IncomeSurplusReport,
	type IncomeSurplusReportItem,
	IncomeSurplusReportWhereInput,
} from './reports.schema';

type Booking = IncomeSurplusReportItem & {
	unpaidCents?: number;
	overdueCents?: number;
};

@Service({
	addToTestSet: [GRAPHQL_TEST_SET],
})
@Resolver()
export class ReportsResolver {
	constructor(
		@Inject(INVOICE_REPOSITORY) private invoiceRepository: InvoiceRepository,
		@Inject(EXPENSE_REPOSITORY) private expenseRepository: ExpenseRepository,
		@Inject(SETTINGS_REPOSITORY) private settingsRepository: SettingsRepository,
		@Inject(EVENTBUS_SERVICE) private eventBus: EventBusService,
	) {}

	private async getRelevantData(
		startDate: Date,
		endDate: Date,
	): Promise<{ invoices: InvoiceEntity[]; expenses: ExpenseEntity[] }> {
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

	private async getBookings(
		startDate: Date,
		endDate: Date,
	): Promise<Booking[]> {
		const { invoices, expenses } = await this.getRelevantData(
			startDate,
			endDate,
		);
		const bookings: Booking[] = [];
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
				unpaidCents: invoice.totalCents - (invoice.paidCents || 0),
				overdueCents:
					invoice.status === InvoiceStatus.SENT &&
					dayjs(invoice.dueAt).isBefore()
						? invoice.totalCents - (invoice.paidCents || 0)
						: 0,
				category: {
					id: 'invoice',
					name: 'Income',
					color: '#000',
					description: 'Income',
				},
			});
		});

		// Load settings once for all expenses
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

		// Sort by invoicedAt
		bookings.sort((a, b) => a.valutaDate.getTime() - b.valutaDate.getTime());

		return bookings;
	}

	@Authorized()
	@Query(() => IncomeSurplusReport)
	async generateReport(
		@Arg('where', () => IncomeSurplusReportWhereInput, { nullable: true })
		where: IncomeSurplusReportWhereInput,
	): Promise<IncomeSurplusReport | undefined> {
		const startDate = where?.startDate || dayjs().startOf('year').toDate();
		const endDate = where?.endDate || dayjs().endOf('year').toDate();

		const bookings = await this.getBookings(startDate, endDate);
		const report = {
			startDate,
			endDate,
			incomeCents: 0,
			expensesCents: 0,
			surplusCents: 0,
			overdueCents: 0,
			overdueInvoices: 0,
			openCents: 0,
			openInvoices: 0,
			invoiceTaxCents: 0,
			expensesTaxCents: 0,
			items: bookings,
		};
		for (const booking of bookings) {
			if (booking.type === 'invoice') {
				report.surplusCents += booking.surplusCents;
				report.incomeCents += booking.surplusCents;
				report.invoiceTaxCents += booking.taxCents;
				report.overdueCents += booking.overdueCents || 0;
				report.overdueInvoices += booking.overdueCents ? 1 : 0;
				report.openCents += booking.unpaidCents || 0;
				report.openInvoices += booking.unpaidCents ? 1 : 0;
			} else if (booking.type === 'expense') {
				report.surplusCents += booking.surplusCents;
				report.expensesCents -= booking.surplusCents;
				report.expensesTaxCents -= booking.taxCents;
			}
		}

		return report;
	}

	@Authorized()
	@Mutation(() => Boolean)
	async generateReportPdf(
		@Arg('where', () => IncomeSurplusReportWhereInput)
		where: IncomeSurplusReportWhereInput,
		@Arg('format', () => ReportFormat) format: ReportFormat,
		@Ctx() context: any, // Need context to get user email
	): Promise<boolean> {
		const startDate = where?.startDate || dayjs().startOf('year').toDate();
		const endDate = where?.endDate || dayjs().endOf('year').toDate();

		// Extract user email from context
		// Assuming context has user info. Based on other resolvers/auth logic
		// src/backend/api/graphql/context-builder.ts defines the context
		// Let's check session usage
		const email = context.session?.email;
		if (!email) {
			throw new Error('User email not found in session');
		}

		await this.eventBus.send('report.generate', {
			start: startDate.toISOString(),
			end: endDate.toISOString(),
			format: format,
			recipientEmail: email,
		});

		return true;
	}
}

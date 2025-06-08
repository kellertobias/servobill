/* eslint-disable @typescript-eslint/no-unused-vars */

import { Query, Resolver, Arg, Authorized } from 'type-graphql';
import dayjs from 'dayjs';

import { ExpenseCategoryType } from '../system/system.schema';

import {
	IncomeSurplusReport,
	IncomeSurplusReportExport,
	IncomeSurplusReportItem,
	IncomeSurplusReportWhereInput,
} from './reports.schema';

import { Inject, Service } from '@/common/di';
import { INVOICE_REPOSITORY } from '@/backend/repositories/invoice/di-tokens';
import { type InvoiceRepository } from '@/backend/repositories/invoice/interface';
import { EXPENSE_REPOSITORY } from '@/backend/repositories/expense/di-tokens';
import { type ExpenseRepository } from '@/backend/repositories/expense/interface';
import {
	InvoiceEntity,
	InvoiceStatus,
	InvoiceType,
} from '@/backend/entities/invoice.entity';
import { ExpenseEntity } from '@/backend/entities/expense.entity';
import { SETTINGS_REPOSITORY } from '@/backend/repositories/settings/di-tokens';
import { type SettingsRepository } from '@/backend/repositories/settings/interface';
import { ExpenseSettingsEntity } from '@/backend/entities/settings.entity';

type Booking = IncomeSurplusReportItem & {
	unpaidCents?: number;
	overdueCents?: number;
};

@Service()
@Resolver()
export class ReportsResolver {
	constructor(
		@Inject(INVOICE_REPOSITORY) private invoiceRepository: InvoiceRepository,
		@Inject(EXPENSE_REPOSITORY) private expenseRepository: ExpenseRepository,
		@Inject(SETTINGS_REPOSITORY) private settingsRepository: SettingsRepository,
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
}

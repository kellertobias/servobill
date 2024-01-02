/* eslint-disable @typescript-eslint/no-unused-vars */

import { Query, Resolver, Arg, Authorized } from 'type-graphql';
import dayjs from 'dayjs';

import {
	IncomeSurplusReport,
	IncomeSurplusReportExport,
	IncomeSurplusReportItem,
	IncomeSurplusReportWhereInput,
} from './reports.schema';

import { Inject, Service } from '@/common/di';
import { InvoiceRepository } from '@/backend/repositories/invoice.repository';
import { ExpenseRepository } from '@/backend/repositories/expense.repository';
import {
	InvoiceEntity,
	InvoiceStatus,
	InvoiceType,
} from '@/backend/entities/invoice.entity';
import { ExpenseEntity } from '@/backend/entities/expense.entity';

type Booking = IncomeSurplusReportItem & {
	unpaidCents?: number;
	overdueCents?: number;
};

@Service()
@Resolver()
export class ReportsResolver {
	constructor(
		@Inject(InvoiceRepository) private invoiceRepository: InvoiceRepository,
		@Inject(ExpenseRepository) private expenseRepository: ExpenseRepository,
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
						true ||
						(invoice.type === InvoiceType.INVOICE &&
							dayjs(invoice.invoicedAt).isAfter(startDate) &&
							dayjs(invoice.invoicedAt).isBefore(endDate) &&
							[
								InvoiceStatus.PAID,
								InvoiceStatus.PAID_PARTIALLY,
								InvoiceStatus.SENT,
							].includes(invoice.status)),
				),
			);

		console.log(invoices);
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
			});
		});

		expenses.forEach((expense) => {
			bookings.push({
				type: 'expense',
				name: `${expense.name}`,
				description: expense.description,
				valutaDate: expense.expendedAt,
				surplusCents: -1 * expense.expendedCents,
				taxCents: -1 * (expense.taxCents || 0),
			});
		});

		// Sort by invoicedAt
		bookings.sort((a, b) => a.valutaDate.getTime() - b.valutaDate.getTime());

		return bookings;
	}

	@Authorized()
	@Query(() => IncomeSurplusReport)
	async generateReport(
		@Arg('where', { nullable: true })
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
				report.surplusCents -= booking.surplusCents;
				report.expensesCents += booking.surplusCents;
				report.expensesTaxCents += booking.taxCents;
			}
		}

		return report;
	}
}

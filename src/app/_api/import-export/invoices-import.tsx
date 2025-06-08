/* eslint-disable @typescript-eslint/no-explicit-any */
import dayjs from 'dayjs';

import { doToast } from '@/components/toast';

import { API, gql } from '../index';

import { requestFile } from './helper';
import { loadInvoiceImportData } from './invoices-import-helper';

import {
	InvoiceImportInput,
	InvoiceStatus,
	InvoiceType,
} from '@/common/gql/graphql';
import { DeferredPromise } from '@/common/deferred';

const getInvoiceStatus = (invoice: InvoiceImportInput) => {
	const total =
		invoice.items?.reduce(
			(sum, item) => sum + item.priceCents * item.quantity,
			0,
		) || 0;
	if (total > 0) {
		if ((invoice.paidCents || 0) >= total) {
			return InvoiceStatus.Paid;
		}
		if ((invoice.paidCents || 0) > 0) {
			return InvoiceStatus.PaidPartially;
		}
	}
	return InvoiceStatus.Sent;
};

type InNinPayments = {
	date?: string; // YYYY-MM-DD
	is_deleted?: boolean;
	amount?: string;
	paymentables?: {
		paymentable_id?: string;
		paymentable_type?: string;
	}[];
};

export const importInvoices = async () => {
	const raw = await requestFile();
	const data = JSON.parse(raw || '{}');
	const waitForImport = new DeferredPromise();

	doToast({
		promise: (async () => {
			console.log(data);
			console.log('Starting Rewriting data');
			const invoices = await loadInvoiceImportData(data);

			console.log('Data rewritten', invoices);

			try {
				console.log('Starting API call');
				await API.query({
					query: gql(`
					mutation ImportInvoices($data: [InvoiceImportInput!]!) {
						importInvoices(data: $data) {
							id
						}
					}
				`),
					variables: {
						data: invoices.map((invoice): InvoiceImportInput => {
							const payments =
								(data.payments as InNinPayments[] | undefined)
									?.filter(
										(pay) =>
											pay.paymentables?.some(
												(p) => p.paymentable_id === invoice.hashed_id,
											),
									)
									.map((pay) => ({
										paidAt: pay.date ? dayjs(pay.date).toDate() : undefined,
										paidCents: pay.amount
											? Number(pay.amount) * 100
											: undefined,
									})) || [];
							// Take maximum date
							const paidAt =
								payments.length > 0
									? payments
											.map((pay) => pay.paidAt)
											.reduce((max, paidAt) => {
												if (!paidAt) {
													return max;
												}
												if (!max) {
													return paidAt;
												}
												return dayjs(paidAt).isAfter(max) ? paidAt : max;
											})
									: undefined;
							const paidCents =
								payments.length > 0
									? payments.reduce((sum, pay) => sum + (pay.paidCents || 0), 0)
									: 0;

							const invoiceMapped: InvoiceImportInput = {
								customerId: invoice.customer.id,
								dueAt: invoice.dueAt
									? dayjs(invoice.dueAt).toISOString()
									: invoice.due_date
										? dayjs(invoice.due_date, 'YYYY-MM-DD').toISOString()
										: undefined,
								footerText: invoice.footerText || invoice.terms,
								invoiceNumber: invoice.invoiceNumber || invoice.number,
								invoicedAt: invoice.invoicedAt
									? dayjs(invoice.invoicedAt).toISOString()
									: invoice.date
										? dayjs(invoice.date, 'YYYY-MM-DD').toISOString()
										: undefined,
								offerNumber: invoice.offerNumber,
								offeredAt: invoice.offeredAt
									? dayjs(invoice.offeredAt).toISOString()
									: undefined,
								paidCents: invoice.paidCents || paidCents || undefined,
								paidVia: invoice.paidVia || 'Import',
								paidAt:
									invoice.paidAt || paidAt
										? dayjs(paidAt).toISOString()
										: undefined,
								status:
									typeof invoice.status === 'string'
										? invoice.status
										: InvoiceStatus.Draft,
								subject: invoice.subject || '',
								type: invoice.type || InvoiceType.Invoice,
								items: (
									invoice.items ||
									invoice.line_items?.map((item) => ({
										name: item.product_key || '',
										description: item.notes || '',
										priceCents: (item.cost || 0) * 100,
										quantity: item.quantity || 0,
										taxPercentage: 0,
									}))
								)?.map((item) => ({
									...item,
									id: undefined,
								})),
							};
							invoiceMapped.status = getInvoiceStatus(invoiceMapped);
							if (invoiceMapped.status === InvoiceStatus.Paid) {
								invoiceMapped.paidAt =
									invoiceMapped.paidAt || invoiceMapped.invoicedAt;
							}
							return invoiceMapped;
						}),
					},
				});
				console.log('API call finished');
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error(error);
				throw error;
			}
			waitForImport.resolve();
		})(),
		loading: 'Importing Invoices...',
		success: 'Invoices Imported!',
		error: 'Failed to import your Invoices.',
	});
	await waitForImport.promise;
};

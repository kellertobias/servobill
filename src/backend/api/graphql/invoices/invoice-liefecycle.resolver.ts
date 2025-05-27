import { Resolver, Arg, Authorized, Mutation, Ctx } from 'type-graphql';
import dayjs from 'dayjs';

import { GqlContext } from '../types';

import {
	Invoice,
	InvoiceChangedResponse,
	InvoicePaymentInput,
	InvoiceSubmissionInput,
} from './invoice.schema';

import { Inject, Service } from '@/common/di';
import { InvoiceSubmissionEntity } from '@/backend/entities/invoice-submission.entity';
import { INVOICE_REPOSITORY } from '@/backend/repositories/invoice/di-tokens';
import { type InvoiceRepository } from '@/backend/repositories/invoice/interface';
import { CUSTOMER_REPOSITORY } from '@/backend/repositories/customer/di-tokens';
import { type CustomerRepository } from '@/backend/repositories/customer/interface';
import { SETTINGS_REPOSITORY } from '@/backend/repositories/settings/di-tokens';
import { type SettingsRepository } from '@/backend/repositories/settings/interface';
import { EXPENSE_REPOSITORY } from '@/backend/repositories/expense/di-tokens';
import { type ExpenseRepository } from '@/backend/repositories/expense/interface';
import { PRODUCT_REPOSITORY } from '@/backend/repositories/product/di-tokens';
import { type ProductRepository } from '@/backend/repositories/product/interface';
import { S3Service } from '@/backend/services/s3.service';
import { Logger } from '@/backend/services/logger.service';
import {
	InvoiceEntity,
	InvoiceStatus,
	InvoiceType,
} from '@/backend/entities/invoice.entity';
import { CustomerEntity } from '@/backend/entities/customer.entity';
import { InvoiceItemEntity } from '@/backend/entities/invoice-item.entity';
import {
	InvoiceActivityEntity,
	InvoiceActivityType,
} from '@/backend/entities/invoice-activity.entity';
import { InvoiceSettingsEntity } from '@/backend/entities/settings.entity';

@Service()
@Resolver(() => Invoice)
export class InvoiceLifecycleResolver {
	private logger = new Logger(InvoiceLifecycleResolver.name);
	constructor(
		@Inject(INVOICE_REPOSITORY) private invoiceRepository: InvoiceRepository,
		@Inject(CUSTOMER_REPOSITORY) private customerRepository: CustomerRepository,
		@Inject(SETTINGS_REPOSITORY) private settingsRepository: SettingsRepository,
		@Inject(EXPENSE_REPOSITORY) private expenseRepository: ExpenseRepository,
		@Inject(PRODUCT_REPOSITORY) private productRepository: ProductRepository,
		@Inject(S3Service) private s3Service: S3Service,
	) {}

	@Authorized()
	@Mutation(() => InvoiceChangedResponse)
	async copyInvoice(
		@Arg('id') invoiceId: string,
		@Arg('as', () => InvoiceType) copyAs: InvoiceType,
		@Ctx() context: GqlContext,
	): Promise<Invoice> {
		const invoice = await this.invoiceRepository.getById(invoiceId);
		if (!invoice) {
			throw new Error('Invoice not found');
		}

		const customer = await this.customerRepository.getById(invoice.customer.id);

		const newInvoice = await this.invoiceRepository.create(
			copyAs,
			customer || new CustomerEntity({ ...invoice.customer }),
			context.session?.user?.name || 'unknown',
		);

		newInvoice.updateTexts({
			subject: invoice.subject,
			footerText: invoice.footerText,
		});

		newInvoice.updateItems(
			invoice.items.map(
				(item) =>
					new InvoiceItemEntity({
						...item,
					}),
			),
		);

		if (invoice.type === InvoiceType.OFFER && copyAs === InvoiceType.INVOICE) {
			invoice.links = { invoiceId: newInvoice.id };
			newInvoice.links = { offerId: invoice.id };

			invoice.addActivity(
				new InvoiceActivityEntity({
					type: InvoiceActivityType.CONVERT_TO_INVOICE,
					user: context.session?.user?.name || 'unknown',
				}),
			);
		}

		await this.invoiceRepository.save(newInvoice);
		await this.invoiceRepository.save(invoice);

		return newInvoice;
	}

	@Authorized()
	@Mutation(() => InvoiceChangedResponse)
	async invoiceDeleteDraft(@Arg('id') invoiceId: string): Promise<Invoice> {
		const invoice = await this.invoiceRepository.getById(invoiceId);
		if (!invoice) {
			throw new Error('Invoice not found');
		}
		await this.invoiceRepository.delete(invoiceId);
		return invoice;
	}

	@Authorized()
	@Mutation(() => InvoiceChangedResponse)
	async invoiceCancelUnpaid(
		@Arg('id') invoiceId: string,
		@Arg('deleteExpenses', () => Boolean, { nullable: true })
		deleteExpenses: boolean = false,
		@Ctx() context: GqlContext,
	): Promise<InvoiceChangedResponse> {
		const invoice = await this.invoiceRepository.getById(invoiceId);
		if (!invoice) {
			throw new Error('Invoice not found');
		}

		// Cancel all linked expenses for this invoice
		if (deleteExpenses) {
			await this.cancelLinkedExpensesForInvoice(invoice);
		}

		const activity = invoice.updateStatus(
			InvoiceStatus.CANCELLED,
			context.session?.user?.name || 'unknown',
		);

		await this.invoiceRepository.save(invoice);

		return {
			id: invoiceId,
			activityId: activity.id,
			updatedAt: activity.activityAt,
			change: activity.type,
		};
	}

	@Authorized()
	@Mutation(() => InvoiceChangedResponse)
	async invoiceSend(
		@Arg('id') invoiceId: string,
		@Arg('submission', () => InvoiceSubmissionInput)
		submission: InvoiceSubmissionInput,
		@Ctx() context: GqlContext,
	): Promise<InvoiceChangedResponse> {
		const invoice = await this.invoiceRepository.getById(invoiceId);
		if (!invoice) {
			throw new Error('Invoice not found');
		}

		const { sendType } = submission;

		const activity = await invoice.addSubmission(
			new InvoiceSubmissionEntity({
				type: sendType,
				submittedAt: new Date(),
			}),
			context.session?.user?.name || 'unknown',
			async () => {
				const setting = await this.settingsRepository.getSetting(
					InvoiceSettingsEntity,
				);
				if (!setting) {
					throw new Error('Invoice Settings not found');
				}
				return setting;
			},
		);

		await this.invoiceRepository.save(invoice);
		await this.createAndLinkExpensesForInvoice(invoice);

		return {
			id: invoiceId,
			activityId: activity.id,
			updatedAt: activity.activityAt,
			change: activity.type,
		};
	}

	@Authorized()
	@Mutation(() => InvoiceChangedResponse)
	async invoiceAddPayment(
		@Arg('id') invoiceId: string,
		@Arg('payment', () => InvoicePaymentInput) payment: InvoicePaymentInput,
		@Ctx() context: GqlContext,
	): Promise<InvoiceChangedResponse> {
		const invoice = await this.invoiceRepository.getById(invoiceId);

		if (!invoice) {
			throw new Error('Invoice not found');
		}

		const { cents, via, when } = payment;

		const activity = invoice.addPayment(
			{
				paidCents: cents,
				paidAt: when || new Date(),
				paidVia: via,
			},
			context.session?.user?.name || 'unknown',
		);

		await this.invoiceRepository.save(invoice);

		return {
			id: invoiceId,
			activityId: activity.id,
			updatedAt: activity.activityAt,
			change: activity.type,
		};
	}

	@Authorized()
	@Mutation(() => String, { nullable: true })
	async invoicePdf(@Arg('id') invoiceId: string): Promise<string | null> {
		const invoice = await this.invoiceRepository.getById(invoiceId);

		this.logger.info('starting invoicePdf');

		if (!invoice) {
			throw new Error('Invoice not found');
		}

		this.logger.info('found invoice');

		if (invoice.pdf && invoice.contentHash === invoice.pdf?.forContentHash) {
			const bucket = invoice.pdf.bucket;
			const key = invoice.pdf.key;
			if (bucket && key) {
				this.logger.info('Invoice PDF already exists');
				return await this.s3Service.getSignedUrl({
					bucket,
					key,
				});
			}

			if (
				!dayjs(invoice.pdf.requestedAt).isBefore(dayjs().subtract(1, 'minute'))
			) {
				this.logger.info('Invoice PDF already requested');
				return null;
			}

			this.logger.info('Last Invoice request was more than 1 minute ago');
		}

		this.logger.info('Requesting Invoice PDF');
		invoice.requestPdf();
		this.logger.info('Requested Invoice PDF, now saving invoice');

		await this.invoiceRepository.save(invoice);

		this.logger.info('Saved Invoice');

		return null;
	}

	/**
	 * Creates expenses for invoice items with products that have expenseCents, and links the expense IDs to the items.
	 *
	 * For each invoice item:
	 *   - If the item references a product (productId), fetch the product.
	 *   - If the product has an expenseCents value > 0, create an expense for this item.
	 *   - The expense amount is calculated as: expenseCents * quantity * expenseMultiplicator.
	 *   - The expense is saved, and its ID is linked to the invoice item (item.expenseId).
	 *
	 * @param invoice The invoice entity to process. This method mutates the invoice's items in-place.
	 */
	private async createAndLinkExpensesForInvoice(invoice: InvoiceEntity) {
		// Iterate over all items in the invoice
		for (const item of invoice.items) {
			// Only process items that reference a product
			if (item.productId) {
				// Fetch the product details
				const product = await this.productRepository.getById(item.productId);
				// Only create an expense if the product has a defined expenseCents > 0
				if (product && product.expenseCents && product.expenseCents > 0) {
					// Use the product's expenseMultiplicator or default to 1
					const multiplicator = product.expenseMultiplicator || 1;
					// Calculate the total expense for this item
					const expendedCents = Math.round(
						product.expenseCents * (item.quantity || 1) * multiplicator,
					);
					// Create and populate the expense entity
					const expense = await this.expenseRepository.create();
					expense.update({
						name: `Expense for ${item.name}`,
						description: item.description,
						expendedCents,
						expendedAt: invoice.invoicedAt || new Date(),
						notes: `Auto-created from invoice ${
							invoice.invoiceNumber || invoice.id
						}`,
					});
					// Save the expense and link its ID to the invoice item
					await this.expenseRepository.save(expense);
					item.expenseId = expense.id;
				}
			}
		}
	}

	/**
	 * Cancels (deletes) all expenses linked to invoice items by expenseId, and clears the expenseId from the items.
	 *
	 * For each invoice item:
	 *   - If the item has an expenseId, delete the corresponding expense.
	 *   - Clear the expenseId from the item.
	 *
	 * @param invoice The invoice entity to process. This method mutates the invoice's items in-place.
	 */
	private async cancelLinkedExpensesForInvoice(invoice: InvoiceEntity) {
		for (const item of invoice.items) {
			if (item.expenseId) {
				await this.expenseRepository.delete(item.expenseId);
				item.expenseId = undefined;
			}
		}
	}
}

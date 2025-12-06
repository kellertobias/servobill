import dayjs from 'dayjs';
import { Arg, Authorized, Ctx, Mutation, Resolver } from 'type-graphql';
import { CustomerEntity } from '@/backend/entities/customer.entity';
import {
	type InvoiceEntity,
	InvoiceStatus,
	InvoiceType,
} from '@/backend/entities/invoice.entity';
import {
	InvoiceActivityEntity,
	InvoiceActivityType,
} from '@/backend/entities/invoice-activity.entity';
import { InvoiceItemEntity } from '@/backend/entities/invoice-item.entity';
import { InvoiceSubmissionEntity } from '@/backend/entities/invoice-submission.entity';
import { InvoiceSettingsEntity } from '@/backend/entities/settings.entity';
import { CUSTOMER_REPOSITORY } from '@/backend/repositories/customer/di-tokens';
import type { CustomerRepository } from '@/backend/repositories/customer/interface';
import { EXPENSE_REPOSITORY } from '@/backend/repositories/expense/di-tokens';
import type { ExpenseRepository } from '@/backend/repositories/expense/interface';
import { INVOICE_REPOSITORY } from '@/backend/repositories/invoice/di-tokens';
import type { InvoiceRepository } from '@/backend/repositories/invoice/interface';
import { PRODUCT_REPOSITORY } from '@/backend/repositories/product/di-tokens';
import type { ProductRepository } from '@/backend/repositories/product/interface';
import { SETTINGS_REPOSITORY } from '@/backend/repositories/settings/di-tokens';
import type { SettingsRepository } from '@/backend/repositories/settings/interface';
import { TIME_BASED_JOB_REPOSITORY } from '@/backend/repositories/time-based-job/di-tokens';
import type { TimeBasedJobRepository } from '@/backend/repositories/time-based-job/interface';
import {
	FILE_STORAGE_SERVICE,
	type FileStorageService,
} from '@/backend/services/file-storage.service';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';
import { GRAPHQL_TEST_SET } from '../di-tokens';
import type { GqlContext } from '../types';
import {
	Invoice,
	InvoiceChangedResponse,
	InvoicePaymentInput,
	InvoiceSubmissionInput,
} from './invoice.schema';

@Service({
	addToTestSet: [GRAPHQL_TEST_SET],
})
@Resolver(() => Invoice)
export class InvoiceLifecycleResolver {
	private logger = new Logger(InvoiceLifecycleResolver.name);
	constructor(
		@Inject(INVOICE_REPOSITORY) private invoiceRepository: InvoiceRepository,
		@Inject(CUSTOMER_REPOSITORY) private customerRepository: CustomerRepository,
		@Inject(SETTINGS_REPOSITORY) private settingsRepository: SettingsRepository,
		@Inject(EXPENSE_REPOSITORY) private expenseRepository: ExpenseRepository,
		@Inject(PRODUCT_REPOSITORY) _productRepository: ProductRepository,
		@Inject(FILE_STORAGE_SERVICE)
		private fileStorageService: FileStorageService,
		@Inject(TIME_BASED_JOB_REPOSITORY)
		private timeBasedJobRepository: TimeBasedJobRepository,
	) {}

	@Authorized()
	@Mutation(() => InvoiceChangedResponse)
	async copyInvoice(
		@Arg('id', () => String) invoiceId: string,
		@Arg('as', () => InvoiceType) copyAs: InvoiceType,
		@Ctx() context: GqlContext,
	): Promise<InvoiceChangedResponse> {
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
			invoice.items.map((item) => {
				const newItem = new InvoiceItemEntity({
					...item,
				});

				if (newItem.linkedExpenses) {
					item.linkedExpenses = newItem.linkedExpenses.map((expense) => {
						return {
							...expense,
							expenseId: undefined,
						};
					});
				}

				return newItem;
			}),
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

		// Add a CREATED_INVOICE activity to the new invoice so we can return a valid InvoiceChangedResponse
		// (COPY is not a valid InvoiceActivityType; CREATED_INVOICE is the closest match for a copy operation)
		const copyActivity = new InvoiceActivityEntity({
			type: InvoiceActivityType.CREATED_INVOICE,
			user: context.session?.user?.name || 'unknown',
		});
		newInvoice.addActivity(copyActivity);

		await this.invoiceRepository.save(newInvoice);
		await this.invoiceRepository.save(invoice);

		// Return the required InvoiceChangedResponse fields
		return {
			id: newInvoice.id,
			activityId: copyActivity.id,
			updatedAt: copyActivity.activityAt,
			change: copyActivity.type,
		};
	}

	@Authorized()
	@Mutation(() => InvoiceChangedResponse)
	async invoiceDeleteDraft(
		@Arg('id', () => String) invoiceId: string,
	): Promise<Invoice> {
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
		@Arg('id', () => String) invoiceId: string,
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

	/**
	 * Handles sending an invoice. If submission.when is provided, schedules a time-based job to send the invoice later.
	 * Stores the job ID in the invoice for later cancellation. If not, sends immediately as before.
	 */
	@Authorized()
	@Mutation(() => InvoiceChangedResponse)
	async invoiceSend(
		@Arg('id', () => String) invoiceId: string,
		@Arg('submission', () => InvoiceSubmissionInput)
		submission: InvoiceSubmissionInput,
		@Ctx() context: GqlContext,
	): Promise<InvoiceChangedResponse> {
		const invoice = await this.invoiceRepository.getById(invoiceId);
		if (!invoice) {
			throw new Error('Invoice not found');
		}

		const { sendType, when } = submission;
		const now = dayjs().add(5, 'minutes').unix();
		const whenTime = when ? dayjs(when).unix() : undefined;
		const scheduledSendJob =
			whenTime && whenTime > now
				? await (async () => {
						// Remove any previous scheduled job for this invoice
						if (invoice.scheduledSendJobId) {
							await this.timeBasedJobRepository.delete(
								invoice.scheduledSendJobId,
							);
						}

						const job = await this.timeBasedJobRepository.create({
							runAfter: whenTime,
							eventType: 'empty',
							eventPayload: { invoiceId: invoice.id },
						});

						return job;
					})()
				: null;

		const activity = await invoice.addSubmission(
			new InvoiceSubmissionEntity({
				type: sendType,
				submittedAt: new Date(),
				isScheduled: !!scheduledSendJob,
				scheduledSendJobId: scheduledSendJob?.id,
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
			scheduledSendJob ?? undefined,
		);

		await this.invoiceRepository.save(invoice);
		await this.createAndLinkExpensesForInvoice(invoice);
		await this.invoiceRepository.save(invoice);

		if (scheduledSendJob) {
			this.timeBasedJobRepository.save(scheduledSendJob);
		}

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
		@Arg('id', () => String) invoiceId: string,
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
	async invoicePdf(
		@Arg('id', () => String) invoiceId: string,
	): Promise<string | null> {
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
				return await this.fileStorageService.getDownloadUrl({
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
	 * Cancels a scheduled invoice send by deleting the time-based job and resetting the invoice to DRAFT,
	 * if the invoice has not been sent yet (no email submission exists).
	 * Returns InvoiceChangedResponse with change=SCHEDULED_SEND.
	 */
	@Authorized()
	@Mutation(() => InvoiceChangedResponse)
	async cancelScheduledInvoiceSend(
		@Arg('id', () => String) invoiceId: string,
	): Promise<InvoiceChangedResponse> {
		const invoice = await this.invoiceRepository.getById(invoiceId);
		if (!invoice) {
			throw new Error('Invoice not found');
		}

		await invoice.cancelSubmission(async (jobId) => {
			await this.timeBasedJobRepository.delete(jobId);
		});

		await this.invoiceRepository.save(invoice);

		return {
			id: invoiceId,
			updatedAt: new Date(),
			change: InvoiceActivityType.SCHEDULED_SEND,
		};
	}

	/**
	 * Creates expenses for invoice items with products that have expenseCents, and links the expense IDs to the items.
	 *
	 * For each invoice item:
	 *   - If the item references a product (productId), fetch the product.
	 *   - If the product has an expenseCents value > 0, create an expense for this item.
	 *   - The expense amount is calculated as: expenseCents * quantity.
	 *   - The expense is saved, and its ID is linked to the invoice item (item.expenseId).
	 *
	 * @param invoice The invoice entity to process. This method mutates the invoice's items in-place.
	 */
	private async createAndLinkExpensesForInvoice(invoice: InvoiceEntity) {
		await invoice.createAndLinkExpensesForInvoice(async (data) => {
			const expense = await this.expenseRepository.create();
			expense.update(data);
			await this.expenseRepository.save(expense);
			return expense;
		});
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
			for (const expense of item.linkedExpenses || []) {
				if (expense.expenseId) {
					await this.expenseRepository.delete(expense.expenseId);
				}
			}
		}
	}
}

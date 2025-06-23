import {
	Query,
	Resolver,
	Arg,
	Int,
	Authorized,
	Mutation,
	Ctx,
} from 'type-graphql';

import { GqlContext } from '../types';
import { GRAPHQL_TEST_SET } from '../di-tokens';

import {
	Invoice,
	InvoiceChangedResponse,
	InvoiceImportInput,
	InvoiceInput,
	InvoiceWhereInput,
} from './invoice.schema';

import { Inject, Service } from '@/common/di';
import { InvoiceEntity, InvoiceType } from '@/backend/entities/invoice.entity';
import {
	InvoiceActivityEntity,
	InvoiceActivityType,
} from '@/backend/entities/invoice-activity.entity';
import {
	INVOICE_REPOSITORY,
	type InvoiceRepository,
} from '@/backend/repositories/invoice';
import { CUSTOMER_REPOSITORY } from '@/backend/repositories/customer/di-tokens';
import { type CustomerRepository } from '@/backend/repositories/customer/interface';
import { SETTINGS_REPOSITORY } from '@/backend/repositories/settings/di-tokens';
import { type SettingsRepository } from '@/backend/repositories/settings/interface';
import { InvoiceItemEntity } from '@/backend/entities/invoice-item.entity';
import { InvoiceSettingsEntity } from '@/backend/entities/settings.entity';
import { CustomerEntity } from '@/backend/entities/customer.entity';
import { ActiveSpan, Span } from '@/backend/instrumentation';
import type { OtelSpan } from '@/backend/instrumentation';
import type { AttachmentRepository } from '@/backend/repositories/attachment/interface';
import { ATTACHMENT_REPOSITORY } from '@/backend/repositories/attachment/di-tokens';
import { FILE_STORAGE_SERVICE } from '@/backend/services/file-storage.service';
import type { FileStorageService } from '@/backend/services/file-storage.service';

@Service({
	addToTestSet: [GRAPHQL_TEST_SET],
})
@Resolver(() => Invoice)
export class InvoiceResolver {
	constructor(
		@Inject(INVOICE_REPOSITORY) private invoiceRepository: InvoiceRepository,
		@Inject(CUSTOMER_REPOSITORY) private customerRepository: CustomerRepository,
		@Inject(SETTINGS_REPOSITORY) private settingsRepository: SettingsRepository,
		@Inject(ATTACHMENT_REPOSITORY)
		private attachmentRepository: AttachmentRepository,
		@Inject(FILE_STORAGE_SERVICE)
		private fileStorage: FileStorageService,
	) {}

	@Authorized()
	@Query(() => [Invoice])
	async invoices(
		@Arg('where', () => InvoiceWhereInput, { nullable: true })
		where?: InvoiceWhereInput,
		@Arg('skip', () => Int, { nullable: true }) skip?: number,
		@Arg('limit', () => Int, { nullable: true }) limit?: number,
		@ActiveSpan() span?: OtelSpan,
	): Promise<Invoice[]> {
		span?.setAttribute('context.where', JSON.stringify(where));
		const data = await this.invoiceRepository.listByQuery({
			where: { ...where },
			skip,
			limit,
		});

		return (
			data
				.filter((invoice) => {
					if (where?.search) {
						return (
							invoice.invoiceNumber?.includes(where.search) ||
							invoice.offerNumber?.includes(where.search) ||
							invoice.customer.name?.includes(where.search)
						);
					}
					return true;
				})
				// .filter((invoice) => invoice.status !== InvoiceStatus.CANCELLED)
				.sort((a, b) => {
					const dateA = a.invoicedAt || a.createdAt;
					const dateB = b.invoicedAt || b.createdAt;
					if (dateA && dateB) {
						return dateB.getTime() - dateA.getTime();
					}
					return 0;
				})
		);
	}

	@Span('InvoiceResolver.invoice')
	@Authorized()
	@Query(() => Invoice)
	async invoice(
		@Arg('id', () => String) id: string,
		@ActiveSpan() span: OtelSpan,
	): Promise<Invoice | null> {
		span?.setAttribute('context.invoiceId', id);
		const invoice = await this.invoiceRepository.getById(id);

		if (!invoice) {
			return null;
		}

		invoice.activity = await Promise.all(
			invoice.activity.map(async (activity) => {
				return {
					...activity,
					attachment: activity.attachmentId
						? await this.attachmentRepository.getById(activity.attachmentId)
						: null,
				};
			}),
		);

		return invoice;
	}

	@Span('InvoiceResolver.createInvoice')
	@Authorized()
	@Mutation(() => Invoice)
	async createInvoice(
		@Arg('customerId', () => String) customerId: string,
		@Arg('type', () => InvoiceType, { nullable: true })
		type: InvoiceType = InvoiceType.INVOICE,
		@Ctx() context: GqlContext,
	): Promise<Invoice> {
		const setting = await this.settingsRepository.getSetting(
			InvoiceSettingsEntity,
		);
		const customer = await this.customerRepository.getById(customerId);

		if (!customer) {
			throw new Error('Customer not found');
		}

		const invoice = await this.invoiceRepository.create(
			type,
			customer,
			context.session?.user?.name || 'Unknown',
		);

		invoice.updateTexts({
			footerText: setting.defaultInvoiceFooterText,
		});

		await this.invoiceRepository.save(invoice);

		return invoice;
	}

	@Span('InvoiceResolver.updateInvoice')
	@Authorized()
	@Mutation(() => Invoice)
	async updateInvoice(
		@Arg('id', () => String) id: string,
		@Arg('data', () => InvoiceInput) data: InvoiceInput,
	): Promise<Invoice> {
		const invoice = await this.invoiceRepository.getById(id);

		if (!invoice) {
			throw new Error('Invoice not found');
		}

		invoice.updateDates({
			offeredAt: data.offeredAt,
			invoicedAt: data.invoicedAt,
			dueAt: data.dueAt,
		});

		invoice.updateTexts({
			subject: data.subject,
			footerText: data.footerText,
		});

		invoice.updateItems(
			data.items.map(
				(item) =>
					new InvoiceItemEntity({
						...item,
					}),
			),
		);

		if (invoice.customer.id !== data.customerId) {
			const customer = await this.customerRepository.getById(data.customerId);
			if (!customer) {
				throw new Error('Customer not found');
			}
			invoice.updateCustomer(customer);
		}

		await this.invoiceRepository.save(invoice);

		return invoice;
	}

	@Span('InvoiceResolver.deleteInvoice')
	@Authorized()
	@Mutation(() => Invoice)
	async deleteInvoice(@Arg('id', () => String) id: string): Promise<Invoice> {
		const invoice = await this.invoiceRepository.getById(id);

		if (!invoice) {
			throw new Error('Invoice not found');
		}

		await this.invoiceRepository.delete(invoice.id);

		return invoice;
	}

	@Span('InvoiceResolver.purgeInvoices')
	@Authorized()
	@Mutation(() => Boolean)
	async purgeInvoices(
		@Arg('confirm', () => String) confirm: string,
	): Promise<boolean> {
		if (confirm !== 'confirm') {
			throw new Error('Confirmation string is wrong');
		}
		const invoices = await this.invoiceRepository.listByQuery({
			where: {},
		});
		for (const invoice of invoices) {
			await this.invoiceRepository.delete(invoice.id);
		}

		return true;
	}

	@Span('InvoiceResolver.importInvoices')
	@Authorized()
	@Mutation(() => [Invoice])
	async importInvoices(
		@Arg('data', () => [InvoiceImportInput]) data: [InvoiceImportInput],
		@Ctx() context: GqlContext,
	): Promise<Invoice[]> {
		const customers = new Map<string, CustomerEntity>();
		const invoices: InvoiceEntity[] = [];
		for (const invoiceData of data) {
			let customer: CustomerEntity | null = null;
			if (customers.has(invoiceData.customerId)) {
				customer = customers.get(invoiceData.customerId) || null;
			} else {
				customer = await this.customerRepository.getById(
					invoiceData.customerId,
				);
				if (!customer) {
					throw new Error('Customer not found');
				}
				customers.set(invoiceData.customerId, customer);
			}
			if (!customer) {
				throw new Error('Customer not found');
			}

			const invoice = await this.invoiceRepository.create(
				invoiceData.type,
				customer,
				context.session?.user?.name || 'Unknown',
			);
			invoices.push(invoice);

			// Preserve original activity history if provided
			invoice.activity =
				invoiceData.activity && invoiceData.activity.length > 0
					? invoiceData.activity.map(
							(activityData) =>
								new InvoiceActivityEntity({
									activityAt: activityData.activityAt,
									type: activityData.type,
									user: activityData.user,
									notes: activityData.notes,
									attachToEmail: activityData.attachToEmail,
									attachmentId: activityData.attachmentId,
								}),
						)
					: [];

			// Add import activity to track this import action
			invoice.addActivity(
				new InvoiceActivityEntity({
					type: InvoiceActivityType.IMPORTED,
					user: context.session?.user?.name || 'Unknown',
				}),
			);

			invoice.createdAt =
				invoiceData.invoicedAt || invoiceData.offeredAt || new Date();

			invoice.updateDates({
				offeredAt: invoiceData.offeredAt,
				invoicedAt: invoiceData.invoicedAt,
				dueAt: invoiceData.dueAt,
			});
			invoice.updateTexts({
				subject: invoiceData.subject,
				footerText: invoiceData.footerText,
			});
			invoice.updateItems(
				invoiceData.items.map(
					(item) =>
						new InvoiceItemEntity({
							...item,
						}),
				),
			);
			invoice.invoiceNumber = invoiceData.invoiceNumber;
			invoice.offerNumber = invoiceData.offerNumber;
			invoice.status = invoiceData.status;

			// Handle payment information
			if (invoiceData.paidCents) {
				// Only add payment activity if there isn't already a payment activity
				const hasPaymentActivity = invoice.activity.some(
					(activity) => activity.type === InvoiceActivityType.PAYMENT,
				);

				if (!hasPaymentActivity) {
					invoice.addPayment(
						{
							paidCents: invoiceData.paidCents,
							paidAt: invoiceData.paidAt || new Date(),
							paidVia: invoiceData.paidVia || 'Unknown',
						},
						context.session?.user?.name || 'Unknown',
					);
				}
			}

			// Set payment fields directly to ensure they're preserved
			invoice.paidCents = invoiceData.paidCents;
			invoice.paidAt = invoiceData.paidAt;
			invoice.paidVia = invoiceData.paidVia;

			await this.invoiceRepository.save(invoice);
		}
		return invoices;
	}

	@Span('InvoiceResolver.invoiceAddComment')
	@Authorized()
	@Mutation(() => InvoiceChangedResponse)
	async invoiceAddComment(
		@Arg('invoiceId', () => String) invoiceId: string,
		@Arg('comment', () => String, { nullable: true }) comment: string | null,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		@Arg('attachmentId', () => String, { nullable: true })
		attachmentId: string | null,
		@Arg('attachToEmail', () => Boolean, { nullable: true })
		attachToEmail: boolean | null,
		@Ctx() context: GqlContext,
	): Promise<InvoiceChangedResponse> {
		const invoice = await this.invoiceRepository.getById(invoiceId);

		if (!invoice) {
			throw new Error('Invoice not found');
		}

		const activity = new InvoiceActivityEntity({
			type: (() => {
				if (!comment && !attachmentId) {
					throw new Error('No comment or attachment provided');
				}
				if (!comment && attachmentId) {
					return InvoiceActivityType.ATTACHMENT;
				}
				return InvoiceActivityType.NOTE;
			})(),
			notes: comment || undefined,
			user: context.session?.user?.name,
			attachToEmail: attachToEmail || false,
		});

		if (attachmentId) {
			const attachment = await this.attachmentRepository.getById(attachmentId);
			if (attachment) {
				activity.attachmentId = attachment.id;
				attachment.setInvoiceId(invoiceId);
				await this.attachmentRepository.save(attachment);
			}
		}
		invoice.addActivity(activity);

		await this.invoiceRepository.save(invoice);

		return {
			id: invoiceId,
			activityId: activity.id,
			updatedAt: activity.activityAt,
			change: activity.type,
		};
	}

	/**
	 * Sets or unsets the 'attachToEmail' flag for an ATTACHMENT activity.
	 *
	 * @param activityId The ID of the activity to update.
	 * @param attachToEmail Whether to attach the file to outgoing emails.
	 * @returns The changed invoice response.
	 */
	@Authorized()
	@Mutation(() => InvoiceChangedResponse)
	async setInvoiceActivityAttachmentEmailFlag(
		@Arg('invoiceId', () => String) invoiceId: string,
		@Arg('activityId', () => String) activityId: string,
		@Arg('attachToEmail', () => Boolean) attachToEmail: boolean,
	): Promise<InvoiceChangedResponse> {
		const invoice = await this.invoiceRepository.getById(invoiceId);
		if (!invoice) {
			throw new Error('Invoice not found');
		}
		const activity = invoice.activity.find((a) => a.id === activityId);
		if (!activity) {
			throw new Error('Activity not found');
		}
		if (activity.type !== InvoiceActivityType.ATTACHMENT) {
			throw new Error('Not an attachment activity');
		}
		activity.attachToEmail = attachToEmail;
		await this.invoiceRepository.save(invoice);
		return {
			id: invoiceId,
			activityId: activity.id,
			updatedAt: activity.activityAt,
			change: activity.type,
		};
	}

	/**
	 * Deletes an ATTACHMENT activity and the linked attachment.
	 *
	 * @param invoiceId The ID of the invoice.
	 * @param activityId The ID of the activity to delete.
	 * @returns The changed invoice response.
	 */
	@Authorized()
	@Mutation(() => InvoiceChangedResponse)
	async deleteInvoiceAttachmentActivity(
		@Arg('invoiceId', () => String) invoiceId: string,
		@Arg('activityId', () => String) activityId: string,
	): Promise<InvoiceChangedResponse> {
		const invoice = await this.invoiceRepository.getById(invoiceId);
		if (!invoice) {
			throw new Error('Invoice not found');
		}
		const idx = invoice.activity.findIndex((a) => a.id === activityId);
		if (idx === -1) {
			throw new Error('Activity not found');
		}
		const activity = invoice.activity[idx];
		if (activity.type !== InvoiceActivityType.ATTACHMENT) {
			throw new Error('Not an attachment activity');
		}
		// Remove the activity
		invoice.activity.splice(idx, 1);
		// Delete the file from storage before removing the DB record
		if (activity.attachmentId) {
			const attachment = await this.attachmentRepository.getById(
				activity.attachmentId,
			);
			if (attachment && attachment.s3Bucket && attachment.s3Key) {
				await this.fileStorage.deleteFile(attachment.s3Key, {
					bucket: attachment.s3Bucket,
				});
			}
			await this.attachmentRepository.delete(activity.attachmentId);
		}
		await this.invoiceRepository.save(invoice);
		return {
			id: invoiceId,
			activityId: activityId,
			updatedAt: new Date(),
			change: InvoiceActivityType.ATTACHMENT,
		};
	}
}

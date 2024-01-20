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

import {
	Invoice,
	InvoiceChangedResponse,
	InvoiceImportInput,
	InvoiceInput,
	InvoiceWhereInput,
} from './invoice.schema';

import { Inject, Service } from '@/common/di';
import {
	InvoiceEntity,
	InvoiceStatus,
	InvoiceType,
} from '@/backend/entities/invoice.entity';
import {
	InvoiceActivityEntity,
	InvoiceActivityType,
} from '@/backend/entities/invoice-activity.entity';
import { InvoiceRepository } from '@/backend/repositories/invoice.repository';
import { CustomerRepository } from '@/backend/repositories/customer.repository';
import { InvoiceItemEntity } from '@/backend/entities/invoice-item.entity';
import { SettingsRepository } from '@/backend/repositories/settings.repository';
import { InvoiceSettingsEntity } from '@/backend/entities/settings.entity';
import { CustomerEntity } from '@/backend/entities/customer.entity';
import { ActiveSpan, Span } from '@/backend/instrumentation';
import type { OtelSpan } from '@/backend/instrumentation';

@Service()
@Resolver(() => Invoice)
export class InvoiceResolver {
	constructor(
		@Inject(InvoiceRepository) private invoiceRepository: InvoiceRepository,
		@Inject(CustomerRepository) private customerRepository: CustomerRepository,
		@Inject(SettingsRepository) private settingsRepository: SettingsRepository,
	) {}

	@Span('InvoiceResolver.invoices')
	@Authorized()
	@Query(() => [Invoice])
	async invoices(
		@ActiveSpan() span: OtelSpan,
		@Arg('where', { nullable: true }) where?: InvoiceWhereInput,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		@Arg('skip', () => Int, { nullable: true }) skip?: number,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		@Arg('limit', () => Int, { nullable: true }) limit?: number,
	): Promise<Invoice[]> {
		span.setAttribute('context.where', JSON.stringify(where));
		const data = await this.invoiceRepository.listByQuery({
			where: { ...where },
			skip,
			limit,
		});

		return data
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
			.filter((invoice) => invoice.status !== InvoiceStatus.CANCELLED)
			.sort((a, b) => {
				const dateA = a.invoicedAt || a.createdAt;
				const dateB = b.invoicedAt || b.createdAt;
				if (dateA && dateB) {
					return dateB.getTime() - dateA.getTime();
				}
				return 0;
			});
	}

	@Span('InvoiceResolver.invoice')
	@Authorized()
	@Query(() => Invoice)
	async invoice(
		@Arg('id') id: string,
		@ActiveSpan() span: OtelSpan,
	): Promise<Invoice | null> {
		span.setAttribute('context.invoiceId', id);
		return this.invoiceRepository.getById(id);
	}

	@Span('InvoiceResolver.createInvoice')
	@Authorized()
	@Mutation(() => Invoice)
	async createInvoice(
		@Arg('customerId') customerId: string,
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
		@Arg('id') id: string,
		@Arg('data') data: InvoiceInput,
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
	async deleteInvoice(@Arg('id') id: string): Promise<Invoice> {
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
	async purgeInvoices(@Arg('confirm') confirm: string): Promise<boolean> {
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
			invoice.activity = [];
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

			if (invoiceData.paidCents) {
				invoice.addPayment(
					{
						paidCents: invoiceData.paidCents,
						paidAt: invoiceData.paidAt || new Date(),
						paidVia: invoiceData.paidVia || 'Unknown',
					},
					context.session?.user?.name || 'Unknown',
				);
			}
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
		@Arg('invoiceId') invoiceId: string,
		@Arg('comment') comment: string,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		@Arg('attachment', () => String, { nullable: true })
		attachment: string | null,
		@Ctx() context: GqlContext,
	): Promise<InvoiceChangedResponse> {
		const invoice = await this.invoiceRepository.getById(invoiceId);

		if (!invoice) {
			throw new Error('Invoice not found');
		}

		const activity = new InvoiceActivityEntity({
			type: InvoiceActivityType.NOTE,
			notes: comment,
			user: context.session?.user?.name,
		});

		invoice.addActivity(activity);

		await this.invoiceRepository.save(invoice);

		return {
			id: invoiceId,
			activityId: activity.id,
			updatedAt: activity.activityAt,
			change: activity.type,
		};
	}
}

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
	InvoiceInput,
	InvoiceWhereInput,
} from './invoice.schema';

import { Inject, Service } from '@/common/di';
import { InvoiceStatus, InvoiceType } from '@/backend/entities/invoice.entity';
import {
	InvoiceActivityEntity,
	InvoiceActivityType,
} from '@/backend/entities/invoice-activity.entity';
import { InvoiceRepository } from '@/backend/repositories/invoice.repository';
import { CustomerRepository } from '@/backend/repositories/customer.repository';
import { InvoiceItemEntity } from '@/backend/entities/invoice-item.entity';
import { SettingsRepository } from '@/backend/repositories/settings.repository';
import { InvoiceSettingsEntity } from '@/backend/entities/settings.entity';

@Service()
@Resolver(() => Invoice)
export class InvoiceResolver {
	constructor(
		@Inject(InvoiceRepository) private invoiceRepository: InvoiceRepository,
		@Inject(CustomerRepository) private customerRepository: CustomerRepository,
		@Inject(SettingsRepository) private settingsRepository: SettingsRepository,
	) {}

	@Authorized()
	@Query(() => [Invoice])
	async invoices(
		@Arg('where', { nullable: true }) where?: InvoiceWhereInput,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		@Arg('skip', () => Int, { nullable: true }) skip?: number,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		@Arg('limit', () => Int, { nullable: true }) limit?: number,
	): Promise<Invoice[]> {
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

	@Authorized()
	@Query(() => Invoice)
	async invoice(@Arg('id') id: string): Promise<Invoice | null> {
		return this.invoiceRepository.getById(id);
	}

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

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
import { InvoiceRepository } from '@/backend/repositories/invoice.repository';
import { InvoiceStatus, InvoiceType } from '@/backend/entities/invoice.entity';
import { SettingsRepository } from '@/backend/repositories/settings.repository';
import { InvoiceSettingsEntity } from '@/backend/entities/settings.entity';
import { CustomerRepository } from '@/backend/repositories/customer.repository';
import { CustomerEntity } from '@/backend/entities/customer.entity';
import { InvoiceItemEntity } from '@/backend/entities/invoice-item.entity';
import {
	InvoiceActivityEntity,
	InvoiceActivityType,
} from '@/backend/entities/invoice-activity.entity';
import { S3Service } from '@/backend/services/s3.service';
import { Logger } from '@/backend/services/logger.service';

@Service()
@Resolver(() => Invoice)
export class InvoiceLifecycleResolver {
	private logger = new Logger(InvoiceLifecycleResolver.name);
	constructor(
		@Inject(InvoiceRepository) private invoiceRepository: InvoiceRepository,
		@Inject(CustomerRepository) private customerRepository: CustomerRepository,
		@Inject(SettingsRepository) private settingsRepository: SettingsRepository,
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
		@Ctx() context: GqlContext,
	): Promise<InvoiceChangedResponse> {
		const invoice = await this.invoiceRepository.getById(invoiceId);
		if (!invoice) {
			throw new Error('Invoice not found');
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
}

import crypto from 'crypto';
import { randomUUID } from 'crypto';

import dayjs from 'dayjs';

import { InvoiceGeneratePdfEvent } from '../events/invoice/pdf/event';
import { InvoiceSendEvent } from '../events/invoice/send/event';
import { InvoiceSendLaterEvent } from '../events/invoice/later/event';

import { CustomerEntity } from './customer.entity';
import {
	InvoiceActivityEntity,
	InvoiceActivityType,
} from './invoice-activity.entity';
import { InvoiceItemEntity } from './invoice-item.entity';
import {
	InvoiceSubmissionEntity,
	InvoiceSubmissionType,
} from './invoice-submission.entity';
import { InvoiceSettingsEntity } from './settings.entity';
import { DomainEntity, DomainEntityKeys, DomainEvent } from './abstract.entity';
import { TimeBasedJobEntity } from './time-based-job.entity';
import { ExpenseEntity } from './expense.entity';

import { centsToPrice } from '@/common/money';
import { ObjectProperties } from '@/common/ts-helpers';

export enum InvoiceType {
	INVOICE = 'INVOICE',
	OFFER = 'OFFER',
}

export enum InvoiceStatus {
	DRAFT = 'DRAFT',
	SENT = 'SENT',
	CANCELLED = 'CANCELLED',
	PAID_PARTIALLY = 'PAID_PARTIALLY',
	PAID = 'PAID',
}

export class InvoiceEntity extends DomainEntity {
	public id!: string;
	public subject?: string;
	public offerNumber?: string;
	public invoiceNumber?: string;
	public type!: InvoiceType;
	public status!: InvoiceStatus;
	public submissions!: InvoiceSubmissionEntity[];
	public customer!: CustomerEntity;
	public createdAt!: Date;
	public updatedAt!: Date;
	public offeredAt?: Date;
	public invoicedAt?: Date;
	public dueAt?: Date;
	public paidCents?: number;
	public paidAt?: Date;
	public paidVia?: string;
	public footerText?: string;
	public items!: InvoiceItemEntity[];
	/**
	 * The total amount in cents for this invoice, including tax.
	 * Always initialized to 0 if not provided, to prevent NaN errors in the database layer.
	 * This avoids Postgres errors when inserting undefined/NaN values into integer columns.
	 */
	public totalCents!: number;
	/**
	 * The total tax amount in cents for this invoice.
	 * Always initialized to 0 if not provided, to prevent NaN errors in the database layer.
	 */
	public totalTax!: number;
	public activity!: InvoiceActivityEntity[];
	public contentHash?: string;
	public pdf?: {
		region?: string;
		bucket?: string;
		key?: string;
		requestedAt: Date;
		generatedAt?: Date;
		forContentHash: string;
	};
	public links?: {
		offerId?: string;
		invoiceId?: string;
	};
	/** Tracks which event IDs have been processed to prevent duplicate processing */
	public processedEventIds?: string[];
	/**
	 * The ID of the scheduled time-based job for sending this invoice later, if any.
	 * Used to allow cancellation of scheduled sends before the job runs.
	 */
	public scheduledSendJobId?: string;

	/**
	 * Constructs a new InvoiceEntity. Ensures totalCents and totalTax are always valid numbers (never NaN/undefined).
	 * This prevents database errors when persisting invoices.
	 */
	constructor(props: Partial<Omit<InvoiceEntity, DomainEntityKeys>>) {
		super();
		Object.assign(this, props);
		if (!this.processedEventIds) {
			this.processedEventIds = [];
		}
		// Ensure totalCents and totalTax are always valid numbers (never NaN/undefined/null)
		if (!Number.isFinite(this.totalCents) || this.totalCents === null) {
			this.totalCents = 0;
		}
		if (!Number.isFinite(this.totalTax) || this.totalTax === null) {
			this.totalTax = 0;
		}
	}

	/**
	 * Checks if an event has already been processed
	 * @param eventId The ID of the event to check
	 * @returns true if the event has been processed, false otherwise
	 */
	public hasProcessedEvent(eventId: string): boolean {
		return this.processedEventIds?.includes(eventId) ?? false;
	}

	/**
	 * Marks an event as processed
	 * @param eventId The ID of the event to mark as processed
	 */
	public markEventAsProcessed(eventId: string): void {
		if (!this.processedEventIds) {
			this.processedEventIds = [];
		}
		if (!this.hasProcessedEvent(eventId)) {
			this.processedEventIds.push(eventId);
			this.updatedAt = new Date();
		}
	}

	private updateContentHash(): void {
		const relevantContent = {
			customer: this.customer,
			items: (this.items || []).map((item) => {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { linkedExpenses, productId, ...rest } = item;
				return rest;
			}),
			footerText: this.footerText,
			subject: this.subject,
			invoicedAt: this.invoicedAt,
			offeredAt: this.offeredAt,
			dueAt: this.dueAt,
			offerNumber: this.offerNumber,
			invoiceNumber: this.invoiceNumber,
			totalCents: this.totalCents,
			totalTax: this.totalTax,
		};

		const hashContent = JSON.stringify(relevantContent);

		// hash using md5
		const hash = crypto.createHash('md5').update(hashContent).digest('hex');
		this.contentHash = hash;
	}

	public requestPdf() {
		if (!this.contentHash) {
			throw new Error('Invoice PDF cannot be requested - No Content Hash');
		}

		this.pdf = {
			requestedAt: new Date(),
			forContentHash: this.contentHash,
		};

		this.addEvent(
			new DomainEvent(
				this.id,
				'invoice.pdf',
				new InvoiceGeneratePdfEvent({
					invoiceId: this.id,
					forContentHash: this.contentHash,
				}),
			),
		);

		return this.contentHash;
	}

	public updatePdf(location: { bucket: string; region: string; key: string }) {
		if (!this.contentHash) {
			throw new Error('Invoice PDF cannot be updated - No Content Hash');
		}

		this.pdf = {
			...this.pdf,
			requestedAt: this.pdf?.requestedAt || new Date(),
			forContentHash: this.contentHash,
			...location,
			generatedAt: new Date(),
		};
	}

	public updateDates({
		offeredAt,
		invoicedAt,
		dueAt,
	}: {
		offeredAt?: Date;
		invoicedAt?: Date;
		dueAt?: Date;
	}): void {
		if (
			this.status !== InvoiceStatus.DRAFT &&
			this.status !== InvoiceStatus.SENT
		) {
			throw new Error('Invoice cannot be changed');
		}
		if (offeredAt) {
			this.offeredAt = offeredAt;
		}
		if (invoicedAt) {
			this.invoicedAt = invoicedAt;
		}
		if (dueAt) {
			this.dueAt = dueAt;
		}
		this.updatedAt = new Date();
		this.updateContentHash();

		if (this.status === InvoiceStatus.SENT) {
			this.addEvent(
				new DomainEvent(this.id, 'InvoiceDatesChanged', {
					offeredAt: this.offeredAt,
					invoicedAt: this.invoicedAt,
					dueAt: this.dueAt,
					totalCents: this.totalCents,
					totalTax: this.totalTax,
				}),
			);
		}
	}

	public updateTexts({
		subject,
		footerText,
	}: {
		subject?: string;
		footerText?: string;
	}): void {
		if (subject) {
			this.subject = subject;
		}
		if (footerText) {
			this.footerText = footerText;
		}
		this.updatedAt = new Date();
		this.updateContentHash();
	}

	public updateCustomer(customer: CustomerEntity): void {
		this.customer = customer;
		this.updatedAt = new Date();
		this.updateContentHash();
	}

	public updateItems(items: InvoiceItemEntity[]): void {
		if (this.status !== InvoiceStatus.DRAFT) {
			throw new Error('Invoice cannot be changed');
		}
		this.items = items;
		this.updatedAt = new Date();
		const subtotalCents = items.reduce(
			(total, item) => total + item.getTotalCents(),
			0,
		);
		const totalTax = items.reduce(
			(total, item) => total + item.getTotalTaxCents(),
			0,
		);

		this.totalCents = subtotalCents + totalTax;
		this.totalTax = totalTax;
		this.updateContentHash();
	}

	public addActivity(activity: InvoiceActivityEntity): void {
		this.activity.push(activity);
	}

	public async addSubmission(
		submission: InvoiceSubmissionEntity,
		userName: string,
		getSettings: () => Promise<InvoiceSettingsEntity>,
		scheduledSendJob?: TimeBasedJobEntity,
	) {
		this.submissions.push(submission);

		const settings = await getSettings();

		/**
		 * If a scheduledSendJob is provided, this is a send-later operation:
		 * - Only set scheduledSendJobId and leave status as DRAFT.
		 * - Do not assign invoice/offer numbers or update invoicedAt/offeredAt.
		 * - Add a SCHEDULED_SEND activity instead of a SENT activity.
		 */
		if (scheduledSendJob) {
			this.scheduledSendJobId = scheduledSendJob.id;
			this.updatedAt = new Date();
			const activity = new InvoiceActivityEntity({
				user: userName,
				type: InvoiceActivityType.SCHEDULED_SEND,
				notes: scheduledSendJob
					? `Scheduled to be sent at ${dayjs(scheduledSendJob?.runAfter).format(
							'DD.MM.YYYY HH:mm',
						)}`
					: undefined,
				ref: scheduledSendJob.id,
			});

			const sendScheduledEvent = new DomainEvent(
				this.id,
				'invoice.later',
				new InvoiceSendLaterEvent({
					id: randomUUID().toString(),
					userName,
					invoiceId: this.id,
					submissionId: submission.id,
				}),
			);
			scheduledSendJob.eventType = sendScheduledEvent.name;
			scheduledSendJob.eventPayload = sendScheduledEvent.data;
			scheduledSendJob.updatedAt = new Date();

			this.addEvent(
				new DomainEvent(this.id, 'invoice.scheduled', {
					scheduledSendJobId: scheduledSendJob.id,
				}),
			);
			this.activity.push(activity);
			return activity;
		}

		// Immediate send: proceed as before
		let justSent = false;
		if (this.status === InvoiceStatus.DRAFT) {
			justSent = true;
			this.status = InvoiceStatus.SENT;

			if (this.type === InvoiceType.INVOICE) {
				this.invoiceNumber =
					this.invoiceNumber ?? (await settings.invoiceNumbers.getNextNumber());
			} else {
				this.offerNumber =
					this.offerNumber ?? (await settings.offerNumbers.getNextNumber());
			}
		}

		if (this.type === InvoiceType.INVOICE) {
			this.invoicedAt = this.invoicedAt || new Date();

			this.dueAt =
				this.dueAt ||
				dayjs(this.invoicedAt)
					.add(settings.defaultInvoiceDueDays, 'days')
					.toDate();
		} else {
			this.offeredAt = this.offeredAt || new Date();
			this.dueAt =
				this.dueAt || dayjs().add(settings.offerValidityDays, 'days').toDate();
		}

		let activityType: InvoiceActivityType;

		if (submission.type === InvoiceSubmissionType.EMAIL) {
			activityType =
				this.type === InvoiceType.INVOICE
					? InvoiceActivityType.SENT_INVOICE_EMAIL
					: InvoiceActivityType.SENT_OFFER_EMAIL;
		} else if (submission.type === InvoiceSubmissionType.LETTER) {
			activityType =
				this.type === InvoiceType.INVOICE
					? InvoiceActivityType.SENT_INVOICE_LETTER
					: InvoiceActivityType.SENT_OFFER_LETTER;
		} else {
			activityType =
				this.type === InvoiceType.INVOICE
					? InvoiceActivityType.SENT_INVOICE_MANUALLY
					: InvoiceActivityType.SENT_OFFER_MANUALLY;
		}

		this.updatedAt = new Date();

		if (justSent) {
			this.updateContentHash();
			this.addEvent(
				new DomainEvent(this.id, 'invoice.published', {
					offeredAt: this.offeredAt,
					invoicedAt: this.invoicedAt,
					dueAt: this.dueAt,
					totalCents: this.totalCents,
					totalTax: this.totalTax,
				}),
			);
		}

		if (!this.contentHash) {
			throw new Error('Invoice content hash is missing');
		}

		if (submission.type === InvoiceSubmissionType.EMAIL) {
			this.addEvent(
				new DomainEvent(
					this.id,
					'invoice.send',
					new InvoiceSendEvent({
						id: randomUUID().toString(),
						invoiceId: this.id,
						submissionId: submission.id,
						forContentHash: this.contentHash,
					}),
				),
			);
		}

		const activity = new InvoiceActivityEntity({
			user: userName,
			type: activityType,
		});
		this.activity.push(activity);

		return activity;
	}

	public async cancelSubmission(deleteJob: (jobId: string) => Promise<void>) {
		if (!this.scheduledSendJobId) {
			throw new Error('No scheduled send job to cancel');
		}

		// Set submission to cancelled
		const submission = this.submissions.find(
			(sub) => sub.scheduledSendJobId === this.scheduledSendJobId,
		);
		if (submission) {
			submission.isCancelled = true;
		}

		const activity = this.activity.find(
			(act) => act.ref === this.scheduledSendJobId,
		);
		if (activity) {
			activity.type = InvoiceActivityType.CANCELLED_SCHEDULED_SEND;
		}

		await deleteJob(this.scheduledSendJobId);

		this.scheduledSendJobId = undefined;
		this.updatedAt = new Date();

		return;
	}

	public addPayment(
		props: { paidCents: number; paidAt: Date; paidVia: string },
		user: string,
	) {
		this.paidCents = (this.paidCents || 0) + props.paidCents;
		this.paidAt = props.paidAt;
		this.paidVia = props.paidVia;
		this.updatedAt = new Date();

		const isFullyPaid = this.paidCents >= this.totalCents;

		const activity = new InvoiceActivityEntity({
			user,
			notes: `Paid ${centsToPrice(props.paidCents)} €/${centsToPrice(
				this.totalCents,
			)} € via ${props.paidVia}`,
			type: InvoiceActivityType.PAYMENT,
			activityAt: props.paidAt,
		});
		this.activity.push(activity);

		this.addEvent(
			new DomainEvent(this.id, 'invoice.payment', {
				offeredAt: this.offeredAt,
				invoicedAt: this.invoicedAt,
				dueAt: this.dueAt,
				paidAt: this.paidAt,
				paidVia: this.paidVia,
				paidCents: props.paidCents,
				totalPaidCents: this.paidCents,
				totalCents: this.totalCents,
				totalTax: this.totalTax,
			}),
		);

		if (isFullyPaid) {
			this.activity.push(
				new InvoiceActivityEntity({
					user,
					type: InvoiceActivityType.PAID,
				}),
			);
			this.status = InvoiceStatus.PAID;

			this.addEvent(
				new DomainEvent(this.id, 'InvoicePaid', {
					offeredAt: this.offeredAt,
					invoicedAt: this.invoicedAt,
					dueAt: this.dueAt,
					totalPaidCents: this.paidCents,
					totalCents: this.totalCents,
					totalTax: this.totalTax,
				}),
			);
		} else {
			this.status = InvoiceStatus.PAID_PARTIALLY;
		}

		return this.activity.at(-1) as InvoiceActivityEntity;
	}

	public updateStatus(
		newStatus: InvoiceStatus,
		user: string,
	): InvoiceActivityEntity {
		if (newStatus === InvoiceStatus.CANCELLED) {
			if (this.status != InvoiceStatus.SENT) {
				throw new Error('Invoice cannot be cancelled');
			}
			this.status = newStatus;

			this.activity.push(
				new InvoiceActivityEntity({
					user,
					type:
						this.type === InvoiceType.OFFER
							? InvoiceActivityType.CANCEL_OFFER
							: InvoiceActivityType.CANCEL_INVOICE,
				}),
			);
			if (this.type === InvoiceType.INVOICE) {
				this.addEvent(
					new DomainEvent(this.id, 'InvoiceCancelled', {
						offeredAt: this.offeredAt,
						invoicedAt: this.invoicedAt,
						dueAt: this.dueAt,
						totalCents: this.totalCents,
						totalTax: this.totalTax,
					}),
				);
			}
			return this.activity.at(-1) as InvoiceActivityEntity;
		}
		throw new Error('This status change needs to use the correct method');
	}

	public async createAndLinkExpensesForInvoice(
		createExpense: (
			data: Omit<
				ObjectProperties<ExpenseEntity>,
				'createdAt' | 'updatedAt' | 'id' | DomainEntityKeys
			>,
		) => Promise<ExpenseEntity>,
	) {
		// Iterate over all items in the invoice
		for (const item of this.items) {
			for (const exp of item.linkedExpenses || []) {
				if (!exp.enabled) {
					continue;
				}

				const expendedCents = Math.round(exp.price * (item.quantity || 1));

				const expense = await createExpense({
					name: `${exp.name} (For ${this.invoiceNumber})`,
					description: `From invoice ${this.invoiceNumber || this.id}, item: ${
						item.name
					}, quantity: ${item.quantity}`,
					expendedCents,
					expendedAt: this.invoicedAt || new Date(),
					notes: `Auto-created from invoice ${this.invoiceNumber || this.id}`,
					categoryId: exp.categoryId,
				});

				// update the expenseId of the item
				exp.expenseId = expense.id;
				this.updatedAt = new Date();
			}
		}
	}
}

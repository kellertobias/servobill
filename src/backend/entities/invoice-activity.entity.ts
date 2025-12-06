import { randomUUID } from 'node:crypto';

export enum InvoiceActivityType {
	IMPORTED = 'IMPORTED',
	CREATED_INVOICE = 'CREATED_INVOICE',
	CREATED_OFFER = 'CREATED_OFFER',
	UPDATED = 'UPDATED',
	CONVERT_TO_INVOICE = 'CONVERT_TO_INVOICE',
	ARCHIVE_OFFER = 'ARCHIVE_OFFER',
	ARCHIVE_INVOICE = 'ARCHIVE_INVOICE',
	CANCEL_INVOICE = 'CANCEL_INVOICE',
	CANCEL_OFFER = 'CANCEL_OFFER',
	SENT_OFFER_MANUALLY = 'SENT_OFFER_MANUALLY',
	SENT_OFFER_EMAIL = 'SENT_OFFER_EMAIL',
	SENT_OFFER_LETTER = 'SENT_OFFER_LETTER',
	SENT_INVOICE_MANUALLY = 'SENT_INVOICE_MANUALLY',
	SENT_INVOICE_EMAIL = 'SENT_INVOICE_EMAIL',
	SENT_INVOICE_LETTER = 'SENT_INVOICE_LETTER',
	EMAIL_SENT = 'EMAIL_SENT',
	EMAIL_DELIVERED = 'EMAIL_DELIVERED',
	EMAIL_BOUNCED = 'EMAIL_BOUNCED',
	PAYMENT = 'PAYMENT',
	PAID = 'PAID',
	NOTE = 'NOTE',
	/** Activity for file attachment (linked to attachmentId) */
	ATTACHMENT = 'ATTACHMENT',
	/**
	 * Activity for scheduling a future invoice send (time-based job).
	 */
	SCHEDULED_SEND = 'SCHEDULED_SEND',
	CANCELLED_SCHEDULED_SEND = 'CANCELLED_SCHEDULED_SEND',
}

export class InvoiceActivityEntity {
	public id!: string;
	public activityAt!: Date;
	public type!: InvoiceActivityType;
	public user?: string;
	public notes?: string;
	/** The ID of the linked attachment, if any */
	public attachmentId?: string;
	/** If true, this attachment should be included in outgoing emails */
	public attachToEmail?: boolean;

	public ref?: string;

	constructor(props: Partial<InvoiceActivityEntity>) {
		Object.assign(this, props);
		if (!this.id) {
			this.id = randomUUID().toString();
		}
		if (!this.activityAt) {
			this.activityAt = new Date();
		}
		if (
			this.type === InvoiceActivityType.ATTACHMENT &&
			this.attachToEmail === undefined
		) {
			this.attachToEmail = false;
		}
	}
}

import { IsString } from 'class-validator';

/**
 * Event representing a request to send an invoice at a later (scheduled) time.
 *
 * This event is structurally identical to InvoiceSendEvent, but is used to distinguish
 * scheduled sends from immediate sends. It is handled by the later event handler, which
 * triggers the same logic as an immediate send when the scheduled time arrives.
 */
export class InvoiceSendLaterEvent {
	/**
	 * Unique event ID for idempotency and tracking.
	 */
	@IsString()
	id!: string;

	/**
	 * The ID of the invoice to send.
	 */
	@IsString()
	invoiceId!: string;

	@IsString()
	userName!: string;

	/**
	 * The submission ID associated with this send request.
	 */
	@IsString()
	submissionId!: string;

	constructor(props?: InvoiceSendLaterEvent) {
		if (props) {
			Object.assign(this, props);
		}
	}
}

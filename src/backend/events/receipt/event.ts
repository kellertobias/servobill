import { IsString, IsOptional } from 'class-validator';

/**
 * Event for processing receipts and invoices
 * This event is triggered when a receipt/invoice PDF or image is uploaded
 * or received via email
 */
export class ReceiptEvent {
	@IsString()
	id!: string;

	@IsOptional()
	@IsString()
	attachmentKey?: string;

	@IsOptional()
	@IsString()
	attachmentBucket?: string;

	@IsOptional()
	@IsString()
	emailText?: string;

	constructor(props?: ReceiptEvent) {
		if (props) {
			Object.assign(this, props);
		}
	}
}

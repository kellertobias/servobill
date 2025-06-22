import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

/**
 * Event for processing receipts and invoices
 * This event is triggered when a receipt/invoice PDF or image is uploaded
 * or received via email
 */
export class ReceiptEvent {
	@IsString()
	id!: string;

	@IsOptional()
	@IsBoolean()
	isBreakdown?: boolean;

	@IsOptional()
	@IsString()
	originalEventId?: string;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	attachmentIds?: string[];

	@IsOptional()
	@IsString()
	emailText?: string;

	constructor(props?: ReceiptEvent) {
		if (props) {
			Object.assign(this, props);
		}
	}
}

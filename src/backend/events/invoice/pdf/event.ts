import { IsString } from 'class-validator';

export class InvoiceGeneratePdfEvent {
	@IsString()
	invoiceId!: string;

	@IsString()
	forContentHash!: string;

	constructor(props?: InvoiceGeneratePdfEvent) {
		if (props) {
			Object.assign(this, props);
		}
	}
}

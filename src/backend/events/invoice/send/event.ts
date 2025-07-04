import { IsString } from 'class-validator';

export class InvoiceSendEvent {
	@IsString()
	id!: string;

	@IsString()
	invoiceId!: string;

	@IsString()
	forContentHash!: string;

	@IsString()
	submissionId!: string;

	constructor(props?: InvoiceSendEvent) {
		if (props) {
			Object.assign(this, props);
		}
	}
}

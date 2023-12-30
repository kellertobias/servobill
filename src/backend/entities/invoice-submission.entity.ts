import { randomUUID } from 'crypto';

export enum InvoiceSubmissionType {
	MANUAL = 'MANUAL',
	EMAIL = 'EMAIL',
	LETTER = 'LETTER',
}

export class InvoiceSubmissionEntity {
	public id!: string;
	public type!: InvoiceSubmissionType;
	public submittedAt!: Date;

	constructor(props: Partial<InvoiceSubmissionEntity>) {
		Object.assign(this, props);
		if (!this.id) {
			this.id = randomUUID().toString();
		}
	}
}

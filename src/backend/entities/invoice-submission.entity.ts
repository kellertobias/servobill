import { randomUUID } from 'node:crypto';

export enum InvoiceSubmissionType {
	MANUAL = 'MANUAL',
	EMAIL = 'EMAIL',
	LETTER = 'LETTER',
}

export class InvoiceSubmissionEntity {
	public id!: string;
	public type!: InvoiceSubmissionType;
	public submittedAt!: Date;
	public isScheduled!: boolean;
	public isCancelled!: boolean;
	public scheduledSendJobId?: string;

	constructor(props: Partial<InvoiceSubmissionEntity>) {
		Object.assign(this, props);
		if (!this.id) {
			this.id = randomUUID().toString();
		}
		if (this.isScheduled === undefined) {
			this.isScheduled = false;
		}
		if (this.isScheduled) {
			this.scheduledSendJobId = props.scheduledSendJobId;
		}
		if (this.isCancelled === undefined) {
			this.isCancelled = false;
		}
	}
}

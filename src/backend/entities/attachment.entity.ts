import { randomUUID } from 'crypto';

import { DomainEntity, DomainEntityKeys } from './abstract.entity';

/**
 * Entity representing a file attachment that can be linked to an invoice, expense, or inventory item.
 */
export class AttachmentEntity extends DomainEntity {
	/** Unique identifier for the attachment */
	public id!: string;
	/** Date/time the attachment was created */
	public createdAt!: Date;
	/** Date/time the attachment was last updated */
	public updatedAt!: Date;
	/** Original file name */
	public fileName!: string;
	/** MIME type of the file */
	public mimeType!: string;
	/** File size in bytes */
	public size!: number;
	/** S3 object key */
	public s3Key!: string;
	/** Status of the upload (pending, finished) */
	public status!: 'pending' | 'finished' | 'attached';
	/** Linked invoice ID, if any */
	public invoiceId?: string;
	/** Linked expense IDs, if any */
	public expenseIds?: string[];
	/** Linked inventory ID, if any (future use) */
	public inventoryId?: string;
	/** S3 bucket name */
	public s3Bucket!: string;

	constructor(props: Partial<Omit<AttachmentEntity, DomainEntityKeys>>) {
		super();
		Object.assign(this, props);
		if (!this.id) {
			this.id = randomUUID().toString();
		}
		if (!this.createdAt) {
			this.createdAt = new Date();
		}
		if (!this.updatedAt) {
			this.updatedAt = new Date();
		}
		if (!this.expenseIds) {
			this.expenseIds = [];
		}
		if (!this.status) {
			this.status = 'pending';
		}
		if (!this.s3Bucket) {
			this.s3Bucket = '';
		}
	}

	public setInvoiceId(invoiceId: string | null): void {
		this.invoiceId = invoiceId === null ? undefined : invoiceId;
		this.status = 'attached';
		this.updatedAt = new Date();
	}

	public setExpenseIds(expenseIds: string[] | null): void {
		this.expenseIds = expenseIds === null ? undefined : expenseIds;
		this.status = 'attached';
		this.updatedAt = new Date();
	}

	public addExpenseId(expenseId: string): void {
		if (!this.expenseIds) {
			this.expenseIds = [];
		}
		this.expenseIds.push(expenseId);
		this.status = 'attached';
		this.updatedAt = new Date();
	}

	public removeExpenseId(expenseId: string): void {
		if (!this.expenseIds) {
			return;
		}
		this.expenseIds = this.expenseIds.filter((id) => id !== expenseId);
		if (this.expenseIds.length === 0) {
			this.status = 'pending';
		}
		this.updatedAt = new Date();
	}

	public setInventoryId(inventoryId: string | null): void {
		this.inventoryId = inventoryId === null ? undefined : inventoryId;
		this.status = 'attached';
		this.updatedAt = new Date();
	}

	public setFinished(): void {
		this.status = 'finished';
		this.updatedAt = new Date();
	}
}

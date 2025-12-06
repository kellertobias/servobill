import { Column, Entity, PrimaryColumn } from 'typeorm';

import { OrmEntity } from '@/common/orm-entity-registry';

/**
 * TypeORM entity for Attachment, used in relational databases.
 * Mirrors the AttachmentEntity.
 */
@OrmEntity
@Entity('attachment')
export class AttachmentOrmEntity {
	/** Unique identifier for the attachment */
	@PrimaryColumn('text')
	id!: string;

	/** Date/time the attachment was created */
	@Column('timestamp', { nullable: false })
	createdAt!: Date;

	/** Date/time the attachment was last updated */
	@Column('timestamp', { nullable: false })
	updatedAt!: Date;

	/** Original file name */
	@Column('text')
	fileName!: string;

	/** MIME type of the file */
	@Column('text')
	mimeType!: string;

	/** File size in bytes */
	@Column('integer')
	size!: number;

	/** S3 object key */
	@Column('text')
	s3Key!: string;

	/** S3 bucket name */
	@Column('text')
	s3Bucket!: string;

	/** Status of the upload (pending, finished) */
	@Column('text')
	status!: string;

	/** Linked invoice ID, if any */
	@Column('text', { nullable: true })
	invoiceId?: string;

	/** Linked expense IDs, if any */
	@Column('text', { array: true, nullable: true })
	expenseIds?: string[];

	/** Linked inventory ID, if any */
	@Column('text', { nullable: true })
	inventoryId?: string;
}

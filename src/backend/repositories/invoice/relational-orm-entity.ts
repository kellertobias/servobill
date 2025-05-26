import { Entity, PrimaryColumn, Column } from 'typeorm';

/**
 * TypeORM entity for Invoice, used in relational databases.
 * Mirrors the InvoiceEntity and DynamoDB schema.
 * JSON fields are stored as strings.
 */
@Entity('invoice')
export class InvoiceOrmEntity {
	/** Unique identifier for the invoice */
	@PrimaryColumn('text')
	id!: string;

	/** Subject of the invoice */
	@Column('text', { nullable: true })
	subject?: string;

	/** Offer number */
	@Column('text', { nullable: true })
	offerNumber?: string;

	/** Invoice number */
	@Column('text', { nullable: true })
	invoiceNumber?: string;

	/** Type of invoice (enum as string) */
	@Column('text')
	type!: string;

	/** Status of the invoice (enum as string) */
	@Column('text', { nullable: true })
	status?: string;

	/** Creation timestamp */
	@Column('timestamp', { nullable: false })
	createdAt!: Date;

	/** Last update timestamp */
	@Column('timestamp', { nullable: false })
	updatedAt!: Date;

	/** When the invoice was offered */
	@Column('timestamp', { nullable: true })
	offeredAt?: Date;

	/** When the invoice was issued */
	@Column('timestamp', { nullable: true })
	invoicedAt?: Date;

	/** When the invoice is due */
	@Column('timestamp', { nullable: true })
	dueAt?: Date;

	/** When the invoice was paid */
	@Column('timestamp', { nullable: true })
	paidAt?: Date;

	/** Amount paid in cents */
	@Column('integer', { nullable: true })
	paidCents?: number;

	/** How the invoice was paid */
	@Column('text', { nullable: true })
	paidVia?: string;

	/** Footer text */
	@Column('text', { nullable: true })
	footerText?: string;

	/** Total amount in cents */
	@Column('integer', { nullable: true })
	totalCents?: number;

	/** Total tax in cents */
	@Column('integer', { nullable: true })
	totalTax?: number;

	/** Customer ID */
	@Column('text')
	customerId!: string;

	/** Customer JSON (stringified) */
	@Column('text', { nullable: false })
	customer!: string;

	/** Submissions JSON (stringified) */
	@Column('text', { nullable: true })
	submissions?: string;

	/** Items JSON (stringified) */
	@Column('text', { nullable: true })
	items?: string;

	/** Activity JSON (stringified) */
	@Column('text', { nullable: true })
	activity?: string;

	/** Links JSON (stringified) */
	@Column('text', { nullable: true })
	links?: string;

	/** PDF JSON (stringified) */
	@Column('text', { nullable: true })
	pdf?: string;

	/** Content hash */
	@Column('text', { nullable: true })
	contentHash?: string;
}

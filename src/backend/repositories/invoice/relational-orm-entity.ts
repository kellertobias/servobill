import { Entity, PrimaryColumn, Column } from 'typeorm';

/**
 * TypeORM entity for Invoice, used in relational databases.
 * Mirrors the InvoiceEntity and DynamoDB schema.
 * JSON fields are stored as strings.
 */
@Entity('invoice')
export class InvoiceOrmEntity {
	/** Unique identifier for the invoice */
	@PrimaryColumn()
	id!: string;

	/** Subject of the invoice */
	@Column({ nullable: true })
	subject?: string;

	/** Offer number */
	@Column({ nullable: true })
	offerNumber?: string;

	/** Invoice number */
	@Column({ nullable: true })
	invoiceNumber?: string;

	/** Type of invoice (enum as string) */
	@Column({ nullable: false })
	type!: string;

	/** Status of the invoice (enum as string) */
	@Column({ nullable: true })
	status?: string;

	/** Creation timestamp */
	@Column({ type: 'timestamp', nullable: false })
	createdAt!: Date;

	/** Last update timestamp */
	@Column({ type: 'timestamp', nullable: false })
	updatedAt!: Date;

	/** When the invoice was offered */
	@Column({ type: 'timestamp', nullable: true })
	offeredAt?: Date;

	/** When the invoice was issued */
	@Column({ type: 'timestamp', nullable: true })
	invoicedAt?: Date;

	/** When the invoice is due */
	@Column({ type: 'timestamp', nullable: true })
	dueAt?: Date;

	/** When the invoice was paid */
	@Column({ type: 'timestamp', nullable: true })
	paidAt?: Date;

	/** Amount paid in cents */
	@Column({ type: 'integer', nullable: true })
	paidCents?: number;

	/** How the invoice was paid */
	@Column({ nullable: true })
	paidVia?: string;

	/** Footer text */
	@Column({ nullable: true })
	footerText?: string;

	/** Total amount in cents */
	@Column({ type: 'integer', nullable: true })
	totalCents?: number;

	/** Total tax in cents */
	@Column({ type: 'integer', nullable: true })
	totalTax?: number;

	/** Customer ID */
	@Column({ nullable: false })
	customerId!: string;

	/** Customer JSON (stringified) */
	@Column({ type: 'text', nullable: false })
	customer!: string;

	/** Submissions JSON (stringified) */
	@Column({ type: 'text', nullable: true })
	submissions?: string;

	/** Items JSON (stringified) */
	@Column({ type: 'text', nullable: true })
	items?: string;

	/** Activity JSON (stringified) */
	@Column({ type: 'text', nullable: true })
	activity?: string;

	/** Links JSON (stringified) */
	@Column({ type: 'text', nullable: true })
	links?: string;

	/** PDF JSON (stringified) */
	@Column({ type: 'text', nullable: true })
	pdf?: string;

	/** Content hash */
	@Column({ nullable: true })
	contentHash?: string;
}

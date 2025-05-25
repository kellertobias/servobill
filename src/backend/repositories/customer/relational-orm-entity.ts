import { Entity, PrimaryColumn, Column } from 'typeorm';
import { OrmEntity } from '@/common/orm-entity-registry';

/**
 * TypeORM entity for Customer, used in relational databases.
 * Mirrors the CustomerEntity and DynamoDB schema.
 */
@OrmEntity
@Entity('customer')
export class CustomerOrmEntity {
	/** Unique identifier for the customer */
	@PrimaryColumn()
	id!: string;

	/** Customer number (business logic identifier) */
	@Column({ nullable: false })
	customerNumber!: string;

	/** Customer name */
	@Column({ nullable: false })
	name!: string;

	/** Lowercase name for search */
	@Column({ nullable: false })
	searchName!: string;

	/** Contact name */
	@Column({ nullable: true })
	contactName?: string;

	/** Whether to show contact */
	@Column({ nullable: false, default: false })
	showContact!: boolean;

	/** Email address */
	@Column({ nullable: true })
	email?: string;

	/** Street address */
	@Column({ nullable: true })
	street?: string;

	/** ZIP code */
	@Column({ nullable: true })
	zip?: string;

	/** City */
	@Column({ nullable: true })
	city?: string;

	/** State */
	@Column({ nullable: true })
	state?: string;

	/** Country */
	@Column({ nullable: true })
	country?: string;

	/** Notes */
	@Column({ nullable: true })
	notes?: string;

	/** Creation timestamp */
	@Column({ type: 'timestamp', nullable: false })
	createdAt!: Date;

	/** Last update timestamp */
	@Column({ type: 'timestamp', nullable: false })
	updatedAt!: Date;
}

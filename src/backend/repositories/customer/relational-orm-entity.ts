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
	@PrimaryColumn('text')
	id!: string;

	/** Customer number (business logic identifier) */
	@Column('text')
	customerNumber!: string;

	/** Customer name */
	@Column('text')
	name!: string;

	/** Lowercase name for search */
	@Column('text')
	searchName!: string;

	/** Contact name */
	@Column('text', { nullable: true })
	contactName?: string;

	/** Whether to show contact */
	@Column('boolean', { nullable: false, default: false })
	showContact!: boolean;

	/** Email address */
	@Column('text', { nullable: true })
	email?: string;

	/** Street address */
	@Column('text', { nullable: true })
	street?: string;

	/** ZIP code */
	@Column('text', { nullable: true })
	zip?: string;

	/** City */
	@Column('text', { nullable: true })
	city?: string;

	/** State */
	@Column('text', { nullable: true })
	state?: string;

	/** Country */
	@Column('text', { nullable: true })
	country?: string;

	/** Notes */
	@Column('text', { nullable: true })
	notes?: string;

	/** Creation timestamp */
	@Column('timestamp', { nullable: false })
	createdAt!: Date;

	/** Last update timestamp */
	@Column('timestamp', { nullable: false })
	updatedAt!: Date;
}

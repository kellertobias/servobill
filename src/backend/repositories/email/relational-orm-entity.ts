import { Entity, PrimaryColumn, Column } from 'typeorm';
import { OrmEntity } from '@/common/orm-entity-registry';

/**
 * TypeORM entity for Email, used in relational databases.
 * Mirrors the EmailEntity and DynamoDB schema.
 */
@OrmEntity
@Entity('email')
export class EmailOrmEntity {
	/** Unique identifier for the email */
	@PrimaryColumn()
	id!: string;

	/** Type of the related entity (e.g., invoice, customer) */
	@Column({ nullable: false })
	entityType!: string;

	/** ID of the related entity */
	@Column({ nullable: false })
	entityId!: string;

	/** Recipient email address */
	@Column({ nullable: false })
	recipient!: string;

	/** When the email was sent */
	@Column({ type: 'timestamp', nullable: false })
	sentAt!: Date;
}

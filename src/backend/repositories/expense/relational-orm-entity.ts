import { Entity, PrimaryColumn, Column } from 'typeorm';

import { OrmEntity } from '@/common/orm-entity-registry';

/**
 * TypeORM entity for Expense, used in relational databases.
 * Mirrors the ExpenseEntity and DynamoDB schema.
 */
@OrmEntity
@Entity('expense')
export class ExpenseOrmEntity {
	/** Unique identifier for the expense */
	@PrimaryColumn('text')
	id!: string;

	/** Name of the expense */
	@Column('text')
	name!: string;

	/** Description of the expense */
	@Column('text', { nullable: true })
	description?: string;

	/** Notes about the expense */
	@Column('text', { nullable: true })
	notes?: string;

	/** Creation timestamp */
	@Column('timestamp', { nullable: false })
	createdAt!: Date;

	/** Last update timestamp */
	@Column('timestamp', { nullable: false })
	updatedAt!: Date;

	/** When the expense was made */
	@Column('timestamp', { nullable: false })
	expendedAt!: Date;

	/** Amount expended in cents */
	@Column('integer', { nullable: false })
	expendedCents!: number;

	/** Tax amount in cents */
	@Column('integer', { nullable: true })
	taxCents?: number;

	/** Category ID for the expense */
	@Column('text', { nullable: true })
	categoryId?: string;
}

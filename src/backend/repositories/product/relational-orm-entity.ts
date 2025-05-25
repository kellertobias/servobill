import { Entity, PrimaryColumn, Column } from 'typeorm';
import { OrmEntity } from '@/common/orm-entity-registry';

/**
 * TypeORM entity for Product, used by Postgres and SQLite repositories.
 * Mirrors the ProductEntity domain model.
 */
@OrmEntity
@Entity('products')
export class ProductOrmEntity {
	@PrimaryColumn('text')
	id!: string;

	@Column('text')
	category!: string;

	@Column('text')
	name!: string;

	@Column('text', { nullable: true })
	description?: string;

	@Column('text', { nullable: true })
	notes?: string;

	@Column('text', { nullable: true })
	unit?: string;

	@Column('integer')
	priceCents!: number;

	@Column('integer')
	taxPercentage!: number;

	@Column('integer', { nullable: true })
	expenseCents?: number;

	@Column('integer', { nullable: true })
	expenseMultiplicator?: number;

	@Column('text', { nullable: true })
	expenseCategoryId?: string;

	@Column('datetime')
	createdAt!: Date;

	@Column('datetime')
	updatedAt!: Date;
}

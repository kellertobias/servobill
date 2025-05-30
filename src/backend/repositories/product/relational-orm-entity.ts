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

	@Column('json', { nullable: true })
	expenses?: any[];

	/**
	 * Date and time when the product was created.
	 */
	@Column('timestamp')
	createdAt!: Date;

	/**
	 * Date and time when the product was last updated.
	 */
	@Column('timestamp')
	updatedAt!: Date;
}

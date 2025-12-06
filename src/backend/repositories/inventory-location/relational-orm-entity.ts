import { Column, Entity, PrimaryColumn } from 'typeorm';

import { OrmEntity } from '@/common/orm-entity-registry';

/**
 * Relational database entity for InventoryLocation.
 * Maps to the inventory_locations table in the database.
 */
@OrmEntity
@Entity('inventory_locations')
export class InventoryLocationOrmEntity {
	@PrimaryColumn('text')
	id!: string;

	@Column('varchar')
	name!: string;

	@Column('varchar')
	searchName!: string;

	@Column('varchar', { nullable: true })
	barcode?: string;

	@Column('timestamp')
	createdAt!: Date;

	@Column('timestamp')
	updatedAt!: Date;

	/**
	 * Optional parent location ID for supporting hierarchical locations.
	 * If null, this location is a root node.
	 */
	@Column('text', { nullable: true })
	parent?: string;
}

import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Relational database entity for InventoryLocation.
 * Maps to the inventory_locations table in the database.
 */
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
}

import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Relational database entity for InventoryItem.
 * Maps to the inventory_items table in the database.
 */
@Entity('inventory_items')
export class InventoryItemOrmEntity {
	@PrimaryColumn('text')
	id!: string;

	@Column('text', { nullable: true })
	typeId?: string;

	@Column('varchar', { nullable: true })
	name?: string;

	@Column('varchar', { nullable: true })
	barcode?: string;

	@Column('text')
	locationId!: string;

	@Column('varchar')
	state!: string;

	@Column('json')
	properties!: string;

	@Column('timestamp')
	nextCheck!: Date;

	@Column('timestamp')
	lastScanned!: Date;

	@Column('json')
	history!: string;

	@Column('timestamp')
	createdAt!: Date;

	@Column('timestamp')
	updatedAt!: Date;
}

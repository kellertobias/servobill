import { Column, Entity, PrimaryColumn } from 'typeorm';

import { OrmEntity } from '@/common/orm-entity-registry';

/**
 * TypeORM entity for the Settings table (relational DB).
 */
@OrmEntity
@Entity('settings')
export class SettingsOrmEntity {
	/** Unique identifier for the settings record. */
	@PrimaryColumn('varchar')
	settingId!: string;

	/** The store id (partition key). */
	@PrimaryColumn('varchar')
	storeId!: string;

	/** The settings data, as a string (JSON). */
	@Column('text')
	data!: string;
}

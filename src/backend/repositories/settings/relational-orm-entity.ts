import { Entity, PrimaryColumn, Column } from 'typeorm';

/**
 * TypeORM entity for the Settings table (relational DB).
 */
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

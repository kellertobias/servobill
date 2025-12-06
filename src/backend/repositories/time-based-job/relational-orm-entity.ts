import { Column, Entity, PrimaryColumn } from 'typeorm';

import { OrmEntity } from '@/common/orm-entity-registry';

/**
 * TypeORM entity for time-based jobs (for Postgres/SQLite).
 * Used for scheduling actions such as sending invoices at a later time.
 */
@OrmEntity
@Entity('jobQueue')
export class TimeBasedJobOrmEntity {
	/** Unique identifier for the job */
	@PrimaryColumn('text')
	id!: string;

	/** The runAfter time (s since epoch) when the job should be executed */
	@Column('bigint')
	runAfter!: number;

	/** The type of event/job to execute (e.g., 'send_invoice') */
	@Column('varchar', { length: 64 })
	eventType!: string;

	/** The event payload (arbitrary JSON) */
	@Column('text')
	eventPayload!: string;

	/** Creation timestamp */
	@Column('timestamp', { nullable: false })
	createdAt!: Date;

	/** Last update timestamp */
	@Column('timestamp', { nullable: false })
	updatedAt!: Date;
}

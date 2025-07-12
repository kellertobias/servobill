import { Entity, PrimaryColumn, Column } from 'typeorm';

/**
 * TypeORM entity for time-based jobs (for Postgres/SQLite).
 * Used for scheduling actions such as sending invoices at a later time.
 */
@Entity('time_based_job')
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

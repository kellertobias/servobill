import { DomainEntity } from './abstract.entity';

/**
 * Entity representing a time-based job to be executed at a specific timestamp.
 * Used for scheduling actions such as sending invoices at a later time.
 *
 * Jobs are indexed by timestamp for efficient querying of due jobs.
 * After execution, the job is deleted to avoid cluttering the database.
 */
export class TimeBasedJobEntity extends DomainEntity {
	/** Unique identifier for the job */
	public id!: string;
	/** The runAfter time (in s since epoch) when the job should be executed */
	public runAfter!: number;
	/** The type of event/job to execute (e.g., 'send_invoice') */
	public eventType!: string;
	/** The event payload (e.g., invoiceId, or other data needed for execution) */
	public eventPayload!: Record<string, unknown>;
	public createdAt!: Date;
	public updatedAt!: Date;
	/**
	 * Constructs a new TimeBasedJobEntity.
	 * @param props Partial properties to initialize the job entity
	 */
	constructor(props: Partial<TimeBasedJobEntity>) {
		super();
		Object.assign(this, props);
		if (!this.id) {
			this.id = `${this.eventType || 'job'}_${Date.now()}_${Math.random()
				.toString(36)
				.slice(2, 8)}`;
		}
		if (typeof this.runAfter !== 'number') {
			this.runAfter = Date.now();
		}
		if (!this.createdAt) {
			this.createdAt = new Date();
		}
		if (!this.updatedAt) {
			this.updatedAt = new Date();
		}
	}
}

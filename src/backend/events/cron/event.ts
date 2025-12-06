import { IsString } from 'class-validator';

/**
 * Event for triggering the cron handler to process due time-based jobs.
 * Typically triggered on a schedule (e.g., via cron or scheduled Lambda).
 */
export class CronEvent {
	/** Unique event ID */
	@IsString()
	id!: string;

	/** ISO timestamp when the cron was triggered */
	@IsString()
	triggeredAt!: string;

	constructor(props?: Partial<CronEvent>) {
		if (props) {
			Object.assign(this, props);
		}
	}
}

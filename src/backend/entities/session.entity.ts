import { DomainEntity } from './abstract.entity';

/**
 * Represents a session for a user, including expiration and renewal information.
 */
export class SessionEntity extends DomainEntity {
	/** Unique identifier for the session. */
	public sessionId!: string;
	/** The userId associated with this session. */
	public userId!: string;
	/** Renewal token/id for session renewal. */
	public renewalId!: string;
	/** Expiration date/time for the session. */
	public expiresAt!: Date;
	/** Creation date/time for the session. */
	public createdAt!: Date;
	/** Last update date/time for the session. */
	public updatedAt!: Date;

	/**
	 * The unique id for the session entity (required by DomainEntity).
	 */
	public get id(): string {
		return this.sessionId;
	}

	constructor(props: Partial<SessionEntity>) {
		super();
		Object.assign(this, props);
	}
}

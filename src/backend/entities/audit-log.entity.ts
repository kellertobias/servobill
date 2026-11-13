import { randomUUID } from 'node:crypto';

/** Who performed an audited action. Empty for anonymous requests. */
export type AuditActor = {
	userId?: string;
	email?: string;
	name?: string;
};

export type AuditLogProps = {
	id?: string;
	createdAt?: Date;
	actor?: AuditActor;
	/** What happened, e.g. `createInvoice` or `auth.login`. */
	action: string;
	/** The kind of object the action was performed on, if known. */
	entityType?: string;
	/** The id of the object the action was performed on, if known. */
	entityId?: string;
	/** Whether the action succeeded. */
	success: boolean;
	/** Sanitized input and error information. */
	details?: Record<string, unknown>;
	ipAddress?: string;
};

/**
 * One entry of the audit log: an action a user performed (or tried to
 * perform). Entries are only ever appended, never changed.
 */
export class AuditLogEntity {
	public readonly id: string;
	public readonly createdAt: Date;
	public readonly actor: AuditActor;
	public readonly action: string;
	public readonly entityType?: string;
	public readonly entityId?: string;
	public readonly success: boolean;
	public readonly details: Record<string, unknown>;
	public readonly ipAddress?: string;

	constructor(props: AuditLogProps) {
		this.id = props.id || randomUUID();
		this.createdAt = props.createdAt || new Date();
		this.actor = { ...(props.actor || {}) };
		this.action = props.action;
		this.entityType = props.entityType || undefined;
		this.entityId = props.entityId || undefined;
		this.success = props.success;
		this.details = { ...(props.details || {}) };
		this.ipAddress = props.ipAddress || undefined;
	}
}

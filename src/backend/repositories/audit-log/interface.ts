import type { AuditLogEntity } from '@/backend/entities/audit-log.entity';

export type AuditLogQuery = {
	/** Maximum number of entries to return. */
	limit: number;
	/** Opaque cursor from a previous page. */
	cursor?: string;
	/** Only entries of this user. */
	actorId?: string;
	/** Only entries for this object type. */
	entityType?: string;
};

export type AuditLogPage = {
	entries: AuditLogEntity[];
	/** Cursor for the next (older) page; empty when there are no more. */
	nextCursor?: string;
};

/** Append-only storage for audit log entries. */
export interface AuditLogRepository {
	record(entry: AuditLogEntity): Promise<void>;
	/** Lists entries, newest first. */
	list(query: AuditLogQuery): Promise<AuditLogPage>;
}

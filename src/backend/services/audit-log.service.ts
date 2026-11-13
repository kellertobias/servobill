import {
	type AuditActor,
	AuditLogEntity,
	type AuditLogProps,
} from '@/backend/entities/audit-log.entity';
import {
	AUDIT_LOG_REPOSITORY,
	type AuditLogRepository,
} from '@/backend/repositories/audit-log';
import { Inject, Service } from '@/common/di';
import { Logger } from './logger.service';

const logger = new Logger('AuditLog');

/** Keys whose values are never written to the audit log. */
const SECRET_KEY = /pass(word)?|secret|token|api_?key|credential|hash/i;
const MAX_STRING = 300;
const MAX_ARRAY = 20;
const MAX_DEPTH = 4;

/**
 * Copies a value for the audit log: secrets are replaced, long strings
 * (such as base64 file contents) are shortened and deep structures cut off.
 */
export const sanitizeForAudit = (value: unknown, depth = 0): unknown => {
	if (value === null || value === undefined) {
		return value;
	}
	if (typeof value === 'string') {
		return value.length > MAX_STRING
			? `${value.slice(0, MAX_STRING)}… (${value.length} characters)`
			: value;
	}
	if (typeof value !== 'object') {
		return value;
	}
	if (value instanceof Date) {
		return value.toISOString();
	}
	if (depth >= MAX_DEPTH) {
		return '…';
	}
	if (Array.isArray(value)) {
		const items = value
			.slice(0, MAX_ARRAY)
			.map((item) => sanitizeForAudit(item, depth + 1));
		if (value.length > MAX_ARRAY) {
			items.push(`… ${value.length - MAX_ARRAY} more`);
		}
		return items;
	}
	return Object.fromEntries(
		Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
			key,
			SECRET_KEY.test(key) && entry !== null && entry !== undefined
				? '[redacted]'
				: sanitizeForAudit(entry, depth + 1),
		]),
	);
};

export type AuditRecord = Omit<AuditLogProps, 'id' | 'createdAt'> & {
	actor?: AuditActor;
};

/**
 * Writes audit log entries. Recording never throws: a failure to write the
 * audit log is logged, but does not break the action that was audited.
 */
@Service()
export class AuditLogService {
	constructor(
		@Inject(AUDIT_LOG_REPOSITORY) private repository: AuditLogRepository,
	) {}

	public async record(record: AuditRecord): Promise<void> {
		try {
			await this.repository.record(
				new AuditLogEntity({
					...record,
					details: sanitizeForAudit(record.details || {}) as Record<
						string,
						unknown
					>,
				}),
			);
		} catch (error) {
			logger.error('Could not write audit log entry', {
				action: record.action,
				error,
			});
		}
	}
}

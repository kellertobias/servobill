import { Arg, Authorized, Query, Resolver } from 'type-graphql';
import { UserRole } from '@/backend/entities/user.entity';
import {
	AUDIT_LOG_REPOSITORY,
	type AuditLogRepository,
} from '@/backend/repositories/audit-log';
import { Inject, Service } from '@/common/di';
import { GRAPHQL_TEST_SET } from '../di-tokens';
import {
	AuditLogEntry,
	AuditLogFilter,
	AuditLogPage,
} from './audit-log.schema';

@Service({
	addToTestSet: [GRAPHQL_TEST_SET],
})
@Resolver(() => AuditLogEntry)
export class AuditLogResolver {
	constructor(
		@Inject(AUDIT_LOG_REPOSITORY) private repository: AuditLogRepository,
	) {}

	@Authorized(UserRole.ADMIN)
	@Query(() => AuditLogPage, {
		description: 'Audit log entries, newest first (administrators only)',
	})
	async auditLog(
		@Arg('where', () => AuditLogFilter, { nullable: true })
		where?: AuditLogFilter,
	): Promise<AuditLogPage> {
		const page = await this.repository.list({
			limit: where?.limit ?? 50,
			cursor: where?.cursor || undefined,
			actorId: where?.actorId || undefined,
			entityType: where?.entityType || undefined,
		});
		return {
			entries: page.entries.map((entry) => ({
				id: entry.id,
				createdAt: entry.createdAt,
				actorId: entry.actor.userId,
				actorEmail: entry.actor.email,
				actorName: entry.actor.name,
				action: entry.action,
				entityType: entry.entityType,
				entityId: entry.entityId,
				success: entry.success,
				details: JSON.stringify(entry.details),
				ipAddress: entry.ipAddress,
			})),
			nextCursor: page.nextCursor,
		};
	}
}

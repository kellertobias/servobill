import { AuditLogEntity } from '@/backend/entities/audit-log.entity';
import { DatabaseType } from '@/backend/services/constants';
import { RELATIONALDB_SERVICE } from '@/backend/services/di-tokens';
import type { RelationalDbService } from '@/backend/services/relationaldb.service';
import { Inject, Service } from '@/common/di';
import { shouldRegister } from '../../services/should-register';
import { RELATIONAL_REPOSITORY_TEST_SET } from '../di-tokens';
import { AUDIT_LOG_REPOSITORY } from './di-tokens';
import type {
	AuditLogPage,
	AuditLogQuery,
	AuditLogRepository,
} from './interface';
import { AuditLogOrmEntity } from './relational-orm-entity';

/**
 * Relational DB (Postgres/SQLite) implementation of the AuditLogRepository.
 * The cursor is the number of entries already returned.
 */
@Service({
	name: AUDIT_LOG_REPOSITORY,
	...shouldRegister([DatabaseType.POSTGRES, DatabaseType.SQLITE]),
	addToTestSet: [RELATIONAL_REPOSITORY_TEST_SET],
})
export class AuditLogRelationalRepository implements AuditLogRepository {
	constructor(@Inject(RELATIONALDB_SERVICE) private db: RelationalDbService) {}

	private async repository() {
		await this.db.initialize();
		return this.db.getRepository(AuditLogOrmEntity);
	}

	public async record(entry: AuditLogEntity): Promise<void> {
		const repository = await this.repository();
		const row: AuditLogOrmEntity = {
			id: entry.id,
			createdAt: entry.createdAt,
			actorId: entry.actor.userId || null,
			actorEmail: entry.actor.email || null,
			actorName: entry.actor.name || null,
			action: entry.action,
			entityType: entry.entityType || null,
			entityId: entry.entityId || null,
			success: entry.success,
			details: entry.details || {},
			ipAddress: entry.ipAddress || null,
		};
		await repository.save(repository.create(row));
	}

	public async list(query: AuditLogQuery): Promise<AuditLogPage> {
		const repository = await this.repository();
		const offset = Number.parseInt(query.cursor || '0', 10) || 0;
		const rows = await repository.find({
			where: {
				...(query.actorId ? { actorId: query.actorId } : {}),
				...(query.entityType ? { entityType: query.entityType } : {}),
			},
			order: { createdAt: 'DESC', id: 'DESC' },
			skip: offset,
			// One extra row tells whether there is another page
			take: query.limit + 1,
		});
		const entries = rows.slice(0, query.limit).map(
			(row) =>
				new AuditLogEntity({
					id: row.id,
					createdAt: row.createdAt,
					actor: {
						userId: row.actorId || undefined,
						email: row.actorEmail || undefined,
						name: row.actorName || undefined,
					},
					action: row.action,
					entityType: row.entityType || undefined,
					entityId: row.entityId || undefined,
					success: row.success,
					details: row.details || {},
					ipAddress: row.ipAddress || undefined,
				}),
		);
		return {
			entries,
			nextCursor:
				rows.length > query.limit ? String(offset + query.limit) : undefined,
		};
	}
}

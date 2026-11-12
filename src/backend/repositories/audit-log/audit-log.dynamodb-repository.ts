import { AuditLogEntity } from '@/backend/entities/audit-log.entity';
import { DatabaseType } from '@/backend/services/constants';
import { DYNAMODB_SERVICE } from '@/backend/services/di-tokens';
import type { DynamoDBService } from '@/backend/services/dynamodb.service';
import { Inject, Service } from '@/common/di';
import { shouldRegister } from '../../services/should-register';
import { DYNAMODB_REPOSITORY_TEST_SET } from '../di-tokens';
import { AUDIT_LOG_REPOSITORY } from './di-tokens';
import { type AuditLogOrmEntity, entitySchema } from './dynamodb-orm-entity';
import type {
	AuditLogPage,
	AuditLogQuery,
	AuditLogRepository,
} from './interface';

const parseDetails = (raw?: string): Record<string, unknown> => {
	if (!raw) {
		return {};
	}
	try {
		return JSON.parse(raw) as Record<string, unknown>;
	} catch {
		return {};
	}
};

/**
 * DynamoDB implementation of the AuditLogRepository.
 */
@Service({
	name: AUDIT_LOG_REPOSITORY,
	...shouldRegister(DatabaseType.DYNAMODB),
	addToTestSet: [DYNAMODB_REPOSITORY_TEST_SET],
})
export class AuditLogDynamodbRepository implements AuditLogRepository {
	private storeId = 'auditlog';
	private store;

	constructor(@Inject(DYNAMODB_SERVICE) dynamoDb: DynamoDBService) {
		this.store = dynamoDb.getEntity(entitySchema.schema);
	}

	private toDomain(item: AuditLogOrmEntity): AuditLogEntity {
		return new AuditLogEntity({
			id: item.auditId,
			createdAt: new Date(item.createdAt),
			actor: {
				userId: item.actorId || undefined,
				email: item.actorEmail || undefined,
				name: item.actorName || undefined,
			},
			action: item.action,
			entityType: item.entityType || undefined,
			entityId: item.entityId || undefined,
			success: item.success,
			details: parseDetails(item.details),
			ipAddress: item.ipAddress || undefined,
		});
	}

	public async record(entry: AuditLogEntity): Promise<void> {
		await this.store
			.create({
				storeId: this.storeId,
				auditId: entry.id,
				createdAt: entry.createdAt.toISOString(),
				actorId: entry.actor.userId || '',
				actorEmail: entry.actor.email || '',
				actorName: entry.actor.name || '',
				action: entry.action,
				entityType: entry.entityType || '',
				entityId: entry.entityId || '',
				success: entry.success,
				details: JSON.stringify(entry.details || {}),
				ipAddress: entry.ipAddress || '',
			})
			.go();
	}

	public async list(query: AuditLogQuery): Promise<AuditLogPage> {
		const { actorId, entityType } = query;
		const result = await this.store.query
			.byTime({ storeId: this.storeId })
			.where((attr, op) =>
				[
					actorId ? op.eq(attr.actorId, actorId) : '',
					entityType ? op.eq(attr.entityType, entityType) : '',
				]
					.filter(Boolean)
					.join(' AND '),
			)
			.go({
				order: 'desc',
				limit: query.limit,
				cursor: query.cursor || null,
			});
		return {
			entries: result.data.map((item) => this.toDomain(item)),
			nextCursor: result.cursor || undefined,
		};
	}
}

import { DynamoDBService } from '@/backend/services/dynamodb.service';

/**
 * DynamoDB schema for audit log entries. The `byTime` index on the shared
 * GSI lists all entries of the store ordered by time.
 */
export const entitySchema = DynamoDBService.getSchema({
	model: {
		entity: 'auditlog',
		version: '1',
		service: 'auditlog',
	},
	attributes: {
		storeId: { type: 'string', required: true },
		auditId: { type: 'string', required: true },
		createdAt: { type: 'string', required: true },
		actorId: { type: 'string' },
		actorEmail: { type: 'string' },
		actorName: { type: 'string' },
		action: { type: 'string', required: true },
		entityType: { type: 'string' },
		entityId: { type: 'string' },
		success: { type: 'boolean', required: true },
		/** JSON encoded details. */
		details: { type: 'string' },
		ipAddress: { type: 'string' },
	},
	indexes: {
		byId: {
			pk: { field: 'pk', composite: ['auditId'] },
			sk: { field: 'sk', composite: ['storeId'] },
		},
		byTime: {
			index: 'gsi1pk-gsi1sk-index',
			pk: { field: 'gsi1pk', composite: ['storeId'] },
			sk: { field: 'gsi1sk', composite: ['createdAt', 'auditId'] },
		},
	},
});

export type AuditLogOrmEntity = typeof entitySchema.responseItem;

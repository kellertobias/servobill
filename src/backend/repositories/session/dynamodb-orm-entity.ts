import { DynamoDBService } from '@/backend/services/dynamodb.service';

/**
 * DynamoDB schema definition for the Session entity.
 */
export const entitySchema = DynamoDBService.getSchema({
	model: {
		entity: 'session',
		version: '1',
		service: 'user',
	},
	attributes: {
		userId: { type: 'string' },
		sessionId: { type: 'string', required: true },
		storeId: { type: 'string', required: true },
		renewalId: { type: 'string', required: true },
		expiresAt: { type: 'string', required: true },
		createdAt: { type: 'string', required: true },
		updatedAt: { type: 'string', required: true },
	},
	indexes: {
		bySessionId: {
			pk: { field: 'pk', composite: ['sessionId'] },
			sk: { field: 'sk', composite: ['storeId'] },
		},
		byUserId: {
			index: 'gsi1pk-gsi1sk-index',
			pk: { field: 'gsi1pk', composite: ['userId'] },
			sk: { field: 'gsi1sk', composite: ['expiresAt'] },
		},
	},
});

/**
 * Type representing a Session ORM entity as stored in DynamoDB.
 */
export type SessionOrmEntity = typeof entitySchema.responseItem;

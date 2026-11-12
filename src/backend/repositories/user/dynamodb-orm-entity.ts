import { DynamoDBService } from '@/backend/services/dynamodb.service';

/**
 * DynamoDB schema definition for the User entity.
 */
export const entitySchema = DynamoDBService.getSchema({
	model: {
		entity: 'user',
		version: '1',
		service: 'user',
	},
	attributes: {
		storeId: { type: 'string', required: true },
		userId: { type: 'string', required: true },
		email: { type: 'string', required: true },
		name: { type: 'string', required: true },
		role: { type: 'string', required: true },
		passwordHash: { type: 'string' },
		/** JSON encoded list of linked identities. */
		identities: { type: 'string' },
		disabled: { type: 'boolean' },
		profilePictureUrl: { type: 'string' },
		lastLoginAt: { type: 'string' },
		failedLoginCount: { type: 'number' },
		lockedUntil: { type: 'string' },
		createdAt: { type: 'string', required: true },
		updatedAt: { type: 'string', required: true },
	},
	indexes: {
		byId: {
			pk: { field: 'pk', composite: ['userId'] },
			sk: { field: 'sk', composite: ['storeId'] },
		},
		byEmail: {
			index: 'gsi1pk-gsi1sk-index',
			pk: { field: 'gsi1pk', composite: ['storeId'] },
			sk: { field: 'gsi1sk', composite: ['email'] },
		},
	},
});

export type UserOrmEntity = typeof entitySchema.responseItem;

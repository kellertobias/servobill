import { DynamoDBService } from '@/backend/services/dynamodb.service';
import { ResponseItem } from 'electrodb';

/**
 * DynamoDB schema for Email entity.
 * Defines attributes and indexes for the Email table.
 */
export const entitySchema = DynamoDBService.getSchema({
	model: {
		entity: 'email',
		version: '1',
		service: 'email',
	},
	attributes: {
		storeId: {
			type: 'string',
			required: true,
		},
		emailId: {
			type: 'string',
			required: true,
		},
		entityType: {
			type: 'string',
			required: true,
		},
		entityId: {
			type: 'string',
			required: true,
		},
		recipient: {
			type: 'string',
			required: true,
		},
		sentAt: {
			type: 'string',
			required: true,
		},
	},
	indexes: {
		byId: {
			pk: {
				field: 'pk',
				composite: ['emailId'],
			},
			sk: {
				field: 'sk',
				composite: ['storeId'],
			},
		},
		byName: {
			index: 'gsi1pk-gsi1sk-index',
			pk: {
				field: 'gsi1pk',
				composite: ['storeId'],
			},
			sk: {
				field: 'gsi1sk',
				composite: ['sentAt'],
			},
		},
	},
});

export type EmailSchema = typeof entitySchema.schema;
export type EmailSchemaResponseItem = ResponseItem<
	string,
	string,
	string,
	EmailSchema
>;
export type EmailOrmEntity = typeof entitySchema.responseItem;

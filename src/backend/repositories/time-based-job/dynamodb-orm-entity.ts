import { ResponseItem } from 'electrodb';

import { DynamoDBService } from '@/backend/services/dynamodb.service';

/**
 * DynamoDB schema for TimeBasedJob entity.
 * Defines attributes and indexes for the TimeBasedJob table.
 * Indexed by timestamp for efficient querying of due jobs.
 */
export const entitySchema = DynamoDBService.getSchema({
	model: {
		entity: 'timeBasedJob',
		version: '1',
		service: 'timeBasedJob',
	},
	attributes: {
		jobId: {
			type: 'string',
			required: true,
		},
		// Required for ElectroDB key template and multi-tenant support
		storeId: {
			type: 'string',
			required: true,
		},
		runAfter: {
			type: 'number',
			required: true,
		},
		eventType: {
			type: 'string',
			required: true,
		},
		eventPayload: {
			type: 'string', // JSON stringified
			required: true,
		},
		createdAt: {
			type: 'string',
			required: true,
		},
		updatedAt: {
			type: 'string',
			required: true,
		},
	},
	indexes: {
		byId: {
			pk: {
				field: 'pk',
				composite: ['jobId'],
			},
			sk: {
				field: 'sk',
				composite: ['storeId'],
			},
		},
		byYear: {
			index: 'gsi1pk-gsi1sk-index',
			pk: {
				field: 'gsi1pk',
				composite: ['storeId'],
			},
			sk: {
				field: 'gsi1sk',
				composite: ['runAfter'],
			},
		},
	},
});

export type TimeBasedJobSchema = typeof entitySchema.schema;
export type TimeBasedJobSchemaResponseItem = ResponseItem<
	string,
	string,
	string,
	TimeBasedJobSchema
>;
export type TimeBasedJobOrmEntity = typeof entitySchema.responseItem;

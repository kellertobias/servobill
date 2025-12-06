import type { ResponseItem } from 'electrodb';

import { DynamoDBService } from '@/backend/services/dynamodb.service';

/**
 * DynamoDB schema for Customer entity.
 * Defines attributes and indexes for the Customer table.
 */
export const entitySchema = DynamoDBService.getSchema({
	model: {
		entity: 'customer',
		version: '1',
		service: 'customer',
	},
	attributes: {
		storeId: {
			type: 'string',
			required: true,
		},
		customerId: {
			type: 'string',
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
		customerNumber: {
			type: 'string',
			required: true,
		},
		name: {
			type: 'string',
			required: true,
		},
		searchName: {
			type: 'string',
			required: true,
		},
		contactName: {
			type: 'string',
		},
		showContact: {
			type: 'boolean',
			required: true,
		},
		email: {
			type: 'string',
		},
		street: {
			type: 'string',
		},
		zip: {
			type: 'string',
		},
		city: {
			type: 'string',
		},
		state: {
			type: 'string',
		},
		countryCode: {
			type: 'string',
		},
		notes: {
			type: 'string',
		},
	},
	indexes: {
		byId: {
			pk: {
				field: 'pk',
				composite: ['customerId'],
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
				composite: ['searchName'],
			},
		},
	},
});

export type CustomerSchema = typeof entitySchema.schema;
export type CustomerSchemaResponseItem = ResponseItem<
	string,
	string,
	string,
	CustomerSchema
>;
export type CustomerOrmEntity = typeof entitySchema.responseItem;

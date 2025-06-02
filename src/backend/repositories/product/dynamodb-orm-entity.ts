import { ResponseItem } from 'electrodb';

import { DynamoDBService } from '@/backend/services/dynamodb.service';

export const entitySchema = DynamoDBService.getSchema({
	model: {
		entity: 'product',
		version: '1',
		service: 'product',
	},
	attributes: {
		storeId: {
			type: 'string',
			required: true,
		},
		productId: {
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
		name: {
			type: 'string',
			required: true,
		},
		category: {
			type: 'string',
			required: true,
		},
		searchName: {
			type: 'string',
			required: true,
		},
		description: {
			type: 'string',
		},
		notes: {
			type: 'string',
		},
		unit: {
			type: 'string',
		},
		priceCents: {
			type: 'number',
			required: true,
		},
		taxPercentage: {
			type: 'number',
			required: true,
		},
		expenses: {
			type: 'string',
		},
	},
	indexes: {
		byId: {
			pk: {
				field: 'pk',
				composite: ['productId'],
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

export type ProductSchema = typeof entitySchema.schema;
export type ProductSchemaResponseItem = ResponseItem<
	string,
	string,
	string,
	ProductSchema
>;
export type ProductOrmEntity = typeof entitySchema.responseItem;

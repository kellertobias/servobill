import type { ResponseItem } from 'electrodb';

import { DynamoDBService } from '@/backend/services/dynamodb.service';

/**
 * DynamoDB schema for InventoryType entity.
 * Defines attributes and indexes for the InventoryType table.
 */
export const entitySchema = DynamoDBService.getSchema({
	model: {
		entity: 'inventory-type',
		version: '1',
		service: 'inventory',
	},
	attributes: {
		storeId: {
			type: 'string',
			required: true,
		},
		inventoryTypeId: {
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
		searchName: {
			type: 'string',
			required: true,
		},
		checkInterval: {
			type: 'number',
		},
		checkType: {
			type: 'string',
		},
		properties: {
			type: 'string',
		},
		parent: {
			type: 'string',
		},
	},
	indexes: {
		byId: {
			pk: {
				field: 'pk',
				composite: ['inventoryTypeId'],
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

export type InventoryTypeSchema = typeof entitySchema.schema;
export type InventoryTypeSchemaResponseItem = ResponseItem<
	string,
	string,
	string,
	InventoryTypeSchema
>;
export type InventoryTypeOrmEntity = typeof entitySchema.responseItem;

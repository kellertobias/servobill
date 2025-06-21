import { ResponseItem } from 'electrodb';

import { DynamoDBService } from '@/backend/services/dynamodb.service';

/**
 * DynamoDB schema for InventoryLocation entity.
 * Defines attributes and indexes for the InventoryLocation table.
 */
export const entitySchema = DynamoDBService.getSchema({
	model: {
		entity: 'inventory-location',
		version: '1',
		service: 'inventory',
	},
	attributes: {
		storeId: {
			type: 'string',
			required: true,
		},
		inventoryLocationId: {
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
		barcode: {
			type: 'string',
		},
	},
	indexes: {
		byId: {
			pk: {
				field: 'pk',
				composite: ['inventoryLocationId'],
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

export type InventoryLocationSchema = typeof entitySchema.schema;
export type InventoryLocationSchemaResponseItem = ResponseItem<
	string,
	string,
	string,
	InventoryLocationSchema
>;
export type InventoryLocationOrmEntity = typeof entitySchema.responseItem;

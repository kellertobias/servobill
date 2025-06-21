import { ResponseItem } from 'electrodb';

import { DynamoDBService } from '@/backend/services/dynamodb.service';

/**
 * DynamoDB schema for InventoryItem entity.
 * Defines attributes and indexes for the InventoryItem table.
 */
export const entitySchema = DynamoDBService.getSchema({
	model: {
		entity: 'inventory-item',
		version: '1',
		service: 'inventory',
	},
	attributes: {
		storeId: {
			type: 'string',
			required: true,
		},
		inventoryItemId: {
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
		typeId: {
			type: 'string',
		},
		name: {
			type: 'string',
		},
		barcode: {
			type: 'string',
		},
		locationId: {
			type: 'string',
			required: true,
		},
		state: {
			type: 'string',
			required: true,
		},
		properties: {
			type: 'string',
		},
		nextCheck: {
			type: 'string',
			required: true,
		},
		lastScanned: {
			type: 'string',
			required: true,
		},
		history: {
			type: 'string',
		},
	},
	indexes: {
		byId: {
			pk: {
				field: 'pk',
				composite: ['inventoryItemId'],
			},
			sk: {
				field: 'sk',
				composite: ['storeId'],
			},
		},
		byType: {
			index: 'gsi1pk-gsi1sk-index',
			pk: {
				field: 'gsi1pk',
				composite: ['storeId'],
			},
			sk: {
				field: 'gsi1sk',
				composite: ['typeId'],
			},
		},
	},
});

export type InventoryItemSchema = typeof entitySchema.schema;
export type InventoryItemSchemaResponseItem = ResponseItem<
	string,
	string,
	string,
	InventoryItemSchema
>;
export type InventoryItemOrmEntity = typeof entitySchema.responseItem;

import { ResponseItem } from 'electrodb';

import { DynamoDBService } from '@/backend/services/dynamodb.service';

/**
 * DynamoDB schema for Attachment entity.
 * Defines attributes and indexes for the Attachment table.
 */
export const entitySchema = DynamoDBService.getSchema({
	model: {
		entity: 'attachment',
		version: '1',
		service: 'attachment',
	},
	attributes: {
		storeId: { type: 'string', required: true },
		attachmentId: { type: 'string', required: true },
		createdAt: { type: 'string', required: true },
		updatedAt: { type: 'string', required: true },
		fileName: { type: 'string', required: true },
		mimeType: { type: 'string', required: true },
		size: { type: 'number', required: true },
		s3Key: { type: 'string', required: true },
		s3Bucket: { type: 'string', required: true },
		status: { type: 'string', required: true },
		invoiceId: { type: 'string' },
		expenseId: { type: 'string' },
		inventoryId: { type: 'string' },
	},
	indexes: {
		byId: {
			pk: { field: 'pk', composite: ['attachmentId'] },
			sk: { field: 'sk', composite: ['storeId'] },
		},
		byCreatedAt: {
			index: 'gsi1pk-gsi1sk-index',
			pk: { field: 'gsi1pk', composite: ['storeId'] },
			sk: { field: 'gsi1sk', composite: ['createdAt'] },
		},
		byInvoiceId: {
			index: 'gsi2pk-gsi2sk-index',
			pk: { field: 'gsi2pk', composite: ['invoiceId'] },
			sk: { field: 'gsi2sk', composite: ['createdAt'] },
		},
		byExpenseId: {
			index: 'gsi3pk-gsi3sk-index',
			pk: { field: 'gsi3pk', composite: ['expenseId'] },
			sk: { field: 'gsi3sk', composite: ['createdAt'] },
		},
		byInventoryId: {
			index: 'gsi4pk-gsi4sk-index',
			pk: { field: 'gsi4pk', composite: ['inventoryId'] },
			sk: { field: 'gsi4sk', composite: ['createdAt'] },
		},
		byOrphaned: {
			index: 'gsi5pk-gsi5sk-index',
			pk: { field: 'gsi5pk', composite: ['status'] }, // status = 'pending' or 'finished'
			sk: { field: 'gsi5sk', composite: ['createdAt'] },
		},
	},
});

export type AttachmentSchema = typeof entitySchema.schema;
export type AttachmentSchemaResponseItem = ResponseItem<
	string,
	string,
	string,
	AttachmentSchema
>;
export type AttachmentOrmEntity = typeof entitySchema.responseItem;

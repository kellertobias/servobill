import { ResponseItem } from 'electrodb';

import { DynamoDBService } from '@/backend/services/dynamodb.service';

/**
 * DynamoDB schema for Attachment entity.
 * Defines attributes and a single index for the Attachment table.
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
		/**
		 * Single index field for all linked entity queries.
		 * This will be set to invoiceId, expenseId, inventoryId, or 'orphaned'.
		 */
		linkedId: { type: 'string', required: true },
	},
	indexes: {
		byId: {
			pk: { field: 'pk', composite: ['attachmentId'] },
			sk: { field: 'sk', composite: ['storeId'] },
		},
		byLinkedId: {
			index: 'gsi1pk-gsi1sk-index',
			pk: { field: 'gsi1pk', composite: ['linkedId'] },
			sk: { field: 'gsi1sk', composite: ['createdAt'] },
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

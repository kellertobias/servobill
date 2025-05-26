import { DynamoDBService } from '@/backend/services/dynamodb.service';
import { ResponseItem } from 'electrodb';

/**
 * DynamoDB schema for Invoice entity.
 * Defines attributes and indexes for the Invoice table.
 */
export const entitySchema = DynamoDBService.getSchema({
	model: {
		entity: 'invoice',
		version: '1',
		service: 'invoice',
	},
	attributes: {
		storeId: { type: 'string', required: true },
		invoiceId: { type: 'string', required: true },
		createdAt: { type: 'string', required: true },
		updatedAt: { type: 'string', required: true },
		type: { type: 'string', required: true },
		status: { type: 'string' },
		customerId: { type: 'string', required: true },
		customer: { type: 'string', required: true },
		items: { type: 'string' },
		activity: { type: 'string' },
		submissions: { type: 'string' },
		subject: { type: 'string' },
		offerNumber: { type: 'string' },
		invoiceNumber: { type: 'string' },
		offeredAt: { type: 'string' },
		invoicedAt: { type: 'string' },
		dueAt: { type: 'string' },
		paidCents: { type: 'number' },
		paidAt: { type: 'string' },
		paidVia: { type: 'string' },
		footerText: { type: 'string' },
		totalCents: { type: 'number' },
		totalTax: { type: 'number' },
		links: { type: 'string' },
		contentHash: { type: 'string' },
		pdf: { type: 'string' },
	},
	indexes: {
		byId: {
			pk: { field: 'pk', composite: ['invoiceId'] },
			sk: { field: 'sk', composite: ['storeId'] },
		},
		byYear: {
			index: 'gsi1pk-gsi1sk-index',
			pk: { field: 'gsi1pk', composite: ['storeId'] },
			sk: { field: 'gsi1sk', composite: ['createdAt'] },
		},
	},
});

export type InvoiceSchema = typeof entitySchema.schema;
export type InvoiceSchemaResponseItem = ResponseItem<
	string,
	string,
	string,
	InvoiceSchema
>;
export type InvoiceOrmEntity = typeof entitySchema.responseItem;

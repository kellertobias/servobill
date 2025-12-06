import type { ResponseItem } from 'electrodb';

import { DynamoDBService } from '@/backend/services/dynamodb.service';

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
		storeId: {
			type: 'string',
			required: true,
		},
		invoiceId: {
			type: 'string',
			required: true,
		},
		invoicedAt: {
			type: 'string',
		},
		offeredAt: {
			type: 'string',
		},
		dueAt: {
			type: 'string',
		},
		paidAt: {
			type: 'string',
		},
		totalCents: {
			type: 'number',
		},
		totalTax: {
			type: 'number',
		},
		paidCents: {
			type: 'number',
		},
		offerNumber: {
			type: 'string',
		},
		invoiceNumber: {
			type: 'string',
		},
		customerId: {
			type: 'string',
			required: true,
		},
		customer: {
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
		type: {
			type: 'string',
			required: true,
		},
		status: {
			type: 'string',
		},
		paidVia: {
			type: 'string',
		},
		footerText: {
			type: 'string',
		},
		subject: {
			type: 'string',
		},
		submissions: {
			type: 'string',
		},
		items: {
			type: 'string',
		},
		activity: {
			type: 'string',
		},
		links: {
			type: 'string',
		},
		pdf: {
			type: 'string',
		},
		contentHash: {
			type: 'string',
		},
		processedEventIds: {
			type: 'string',
		},
		scheduledSendJobId: {
			type: 'string',
			// The ID of the scheduled time-based job for sending this invoice later, if any.
			// Used to allow cancellation of scheduled sends before the job runs.
		},
	},
	indexes: {
		byId: {
			pk: {
				field: 'pk',
				composite: ['invoiceId'],
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
				composite: ['createdAt'],
			},
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

import { ResponseItem } from 'electrodb';

import { DynamoDBService } from '@/backend/services/dynamodb.service';

/**
 * DynamoDB schema for Expense entity.
 * Defines attributes and indexes for the Expense table.
 */
export const entitySchema = DynamoDBService.getSchema({
	model: {
		entity: 'expense',
		version: '1',
		service: 'expense',
	},
	attributes: {
		storeId: {
			type: 'string',
			required: true,
		},
		expenseId: {
			type: 'string',
			required: true,
		},
		expendedAt: {
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
		expendedCents: {
			type: 'number',
			required: true,
		},
		taxCents: {
			type: 'number',
		},
		name: {
			type: 'string',
			required: true,
		},
		description: {
			type: 'string',
		},
		notes: {
			type: 'string',
		},
		categoryId: {
			type: 'string',
		},
	},
	indexes: {
		byId: {
			pk: {
				field: 'pk',
				composite: ['expenseId'],
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
				composite: ['expendedAt'],
			},
		},
	},
});

export type ExpenseSchema = typeof entitySchema.schema;
export type ExpenseSchemaResponseItem = ResponseItem<
	string,
	string,
	string,
	ExpenseSchema
>;
export type ExpenseOrmEntity = typeof entitySchema.responseItem;

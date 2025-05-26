import { DynamoDBService } from '@/backend/services/dynamodb.service';
import { ResponseItem } from 'electrodb';

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
		storeId: { type: 'string', required: true },
		expenseId: { type: 'string', required: true },
		createdAt: { type: 'string', required: true },
		updatedAt: { type: 'string', required: true },
		name: { type: 'string', required: true },
		description: { type: 'string' },
		notes: { type: 'string' },
		expendedCents: { type: 'number', required: true },
		taxCents: { type: 'number' },
		expendedAt: { type: 'string', required: true },
		categoryId: { type: 'string' },
	},
	indexes: {
		byId: {
			pk: { field: 'pk', composite: ['expenseId'] },
			sk: { field: 'sk', composite: ['storeId'] },
		},
		byName: {
			index: 'gsi1pk-gsi1sk-index',
			pk: { field: 'gsi1pk', composite: ['storeId'] },
			sk: { field: 'gsi1sk', composite: ['searchName'] },
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

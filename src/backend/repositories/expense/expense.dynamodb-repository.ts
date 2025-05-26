import {
	IndexCompositeAttributes,
	QueryBranches,
	QueryOperations,
	ResponseItem,
} from 'electrodb';

import { AbstractDynamodbRepository } from '@/backend/repositories/abstract-dynamodb-repository';
import { DynamoDBService } from '@/backend/services/dynamodb.service';
import { ExpenseEntity } from '@/backend/entities/expense.entity';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';
import { EXPENSE_REPO_NAME, EXPENSE_REPOSITORY } from './di-tokens';
import { DatabaseType } from '@/backend/services/config.service';
import { shouldRegister } from '../../services/should-register';
import type { ExpenseRepository } from './index';

const entitySchema = DynamoDBService.getSchema({
	model: {
		entity: 'expense',
		version: '1',
		service: 'expense',
	},
	attributes: {
		storeId: { type: 'string', required: true },
		expenseId: { type: 'string', required: true },
		expendedAt: { type: 'string', required: true },
		createdAt: { type: 'string', required: true },
		updatedAt: { type: 'string', required: true },
		expendedCents: { type: 'number', required: true },
		taxCents: { type: 'number' },
		name: { type: 'string', required: true },
		description: { type: 'string' },
		notes: { type: 'string' },
		categoryId: { type: 'string' },
	},
	indexes: {
		byId: {
			pk: { field: 'pk', composite: ['expenseId'] },
			sk: { field: 'sk', composite: ['storeId'] },
		},
		byYear: {
			index: 'gsi1pk-gsi1sk-index',
			pk: { field: 'gsi1pk', composite: ['storeId'] },
			sk: { field: 'gsi1sk', composite: ['expendedAt'] },
		},
		byCategory: {
			index: 'gsi2pk-gsi2sk-index',
			pk: { field: 'gsi2pk', composite: ['categoryId'] },
		},
	},
});

type ExpenseSchema = typeof entitySchema.schema;
type ExpenseSchemaResponseItem = ResponseItem<
	string,
	string,
	string,
	ExpenseSchema
>;
export type ExpenseOrmEntity = typeof entitySchema.responseItem;

/**
 * DynamoDB implementation of the ExpenseRepository interface.
 */
@Service({ name: EXPENSE_REPOSITORY, ...shouldRegister(DatabaseType.DYNAMODB) })
export class ExpenseDynamodbRepository
	extends AbstractDynamodbRepository<
		ExpenseOrmEntity,
		ExpenseEntity,
		[],
		typeof entitySchema.schema
	>
	implements ExpenseRepository
{
	protected logger = new Logger(EXPENSE_REPO_NAME);
	protected mainIdName: string = 'expenseId';
	protected storeId: string = 'expense';
	protected store: any;

	constructor(@Inject(DynamoDBService) private dynamoDb: DynamoDBService) {
		super();
		this.store = this.dynamoDb.getEntity(entitySchema.schema);
	}

	/**
	 * Converts a DynamoDB entity to a domain ExpenseEntity.
	 */
	public ormToDomainEntitySafe(
		entity: Omit<ExpenseOrmEntity, 'storeId'>,
	): ExpenseEntity {
		return new ExpenseEntity({
			id: entity.expenseId,
			name: entity.name,
			description: entity.description,
			notes: entity.notes,
			createdAt: new Date(entity.createdAt),
			updatedAt: new Date(entity.updatedAt),
			expendedAt: new Date(entity.expendedAt),
			expendedCents: entity.expendedCents,
			taxCents: entity.taxCents,
			categoryId: entity.categoryId,
		});
	}

	/**
	 * Converts a domain ExpenseEntity to a DynamoDB entity.
	 */
	public domainToOrmEntity(
		domainEntity: ExpenseEntity,
	): Omit<ExpenseOrmEntity, 'storeId'> {
		return {
			expenseId: domainEntity.id,
			createdAt: domainEntity.createdAt.toISOString(),
			updatedAt: domainEntity.updatedAt.toISOString(),
			expendedAt: domainEntity.expendedAt?.toISOString(),
			expendedCents: domainEntity.expendedCents,
			taxCents: domainEntity.taxCents,
			name: domainEntity.name,
			description: domainEntity.description,
			notes: domainEntity.notes,
			categoryId: domainEntity.categoryId,
		};
	}

	/**
	 * Generates an empty ExpenseEntity with the given id.
	 */
	protected generateEmptyItem(id: string): ExpenseEntity {
		return new ExpenseEntity({
			id,
			name: '',
			description: '',
			notes: '',
			createdAt: new Date(),
			updatedAt: new Date(),
			expendedAt: new Date(),
			expendedCents: 0,
			taxCents: 0,
			categoryId: undefined,
		});
	}

	/**
	 * Lists expenses by query (search, year, skip, limit).
	 * @param query Query object with optional search, year, skip, limit, cursor
	 * @returns Array of ExpenseEntity
	 */
	public async listByQuery(query: {
		where?: { search?: string; year?: number };
		skip?: number;
		limit?: number;
		cursor?: string;
	}): Promise<ExpenseEntity[]> {
		const year = query.where?.year || new Date().getFullYear() - 10;
		const data = await this.store.query
			.byYear({ storeId: this.storeId })
			.gt({ expendedAt: new Date(`${year}-01-01`).toISOString() })
			.go();
		return data.data.map((elm: ExpenseOrmEntity) =>
			this.ormToDomainEntity(elm),
		);
	}
}

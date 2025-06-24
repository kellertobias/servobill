import { shouldRegister } from '../../services/should-register';
import { DYNAMODB_REPOSITORY_TEST_SET } from '../di-tokens';

import { EXPENSE_REPO_NAME, EXPENSE_REPOSITORY } from './di-tokens';
import { entitySchema, ExpenseOrmEntity } from './dynamodb-orm-entity';

import type { ExpenseRepository } from './index';

import { AbstractDynamodbRepository } from '@/backend/repositories/abstract-dynamodb-repository';
import type { DynamoDBService } from '@/backend/services/dynamodb.service';
import { ExpenseEntity } from '@/backend/entities/expense.entity';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';
import { DatabaseType } from '@/backend/services/constants';
import {
	DYNAMODB_SERVICE,
	EVENTBUS_SERVICE,
} from '@/backend/services/di-tokens';
import type { EventBusService } from '@/backend/services/eventbus.service';

/**
 * DynamoDB implementation of the ExpenseRepository interface.
 */
@Service({
	name: EXPENSE_REPOSITORY,
	...shouldRegister(DatabaseType.DYNAMODB),
	addToTestSet: [DYNAMODB_REPOSITORY_TEST_SET],
})
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

	constructor(
		@Inject(DYNAMODB_SERVICE) private dynamoDb: DynamoDBService,
		@Inject(EVENTBUS_SERVICE) protected eventBus: EventBusService,
	) {
		super();
		this.eventBus = eventBus;
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
	 * Applies in-memory filtering for DynamoDB due to index limitations.
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
		let results = data.data.map((elm: ExpenseOrmEntity) =>
			this.ormToDomainEntity(elm),
		);

		// In-memory filtering for search (name, description, notes)
		if (query.where?.search) {
			const search = query.where.search.toLowerCase();
			results = results.filter(
				(exp: ExpenseEntity) =>
					exp.name?.toLowerCase().includes(search) ||
					exp.description?.toLowerCase().includes(search) ||
					exp.notes?.toLowerCase().includes(search),
			);
		}
		// Optionally, add skip/limit if needed
		if (query.skip) {
			results = results.slice(query.skip);
		}
		if (query.limit) {
			results = results.slice(0, query.limit);
		}
		return results;
	}
}

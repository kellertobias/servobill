import { shouldRegister } from '../../services/should-register';
import { RELATIONAL_REPOSITORY_TEST_SET } from '../di-tokens';

import { EXPENSE_REPOSITORY, EXPENSE_REPO_NAME } from './di-tokens';
import { ExpenseOrmEntity } from './relational-orm-entity';

import type { ExpenseRepository } from './index';

import { Inject, Service } from '@/common/di';
import { ExpenseEntity } from '@/backend/entities/expense.entity';
import { Logger } from '@/backend/services/logger.service';
import { AbstractRelationalRepository } from '@/backend/repositories/abstract-relational-repository';
import { DatabaseType } from '@/backend/services/constants';
import type { RelationalDbService } from '@/backend/services/relationaldb.service';
import {
	EVENTBUS_SERVICE,
	RELATIONALDB_SERVICE,
} from '@/backend/services/di-tokens';
import type { EventBusService } from '@/backend/services/eventbus.service';

/**
 * Unified repository for Expense using TypeORM (Postgres or SQLite).
 * Handles mapping between ExpenseOrmEntity and ExpenseEntity.
 */
@Service({
	name: EXPENSE_REPOSITORY,
	...shouldRegister([DatabaseType.POSTGRES, DatabaseType.SQLITE]),
	addToTestSet: [RELATIONAL_REPOSITORY_TEST_SET],
})
export class ExpenseRelationalRepository
	extends AbstractRelationalRepository<ExpenseOrmEntity, ExpenseEntity, []>
	implements ExpenseRepository
{
	/** Logger instance for this repository. */
	protected logger = new Logger(EXPENSE_REPO_NAME);

	constructor(
		@Inject(RELATIONALDB_SERVICE) db: RelationalDbService,
		@Inject(EVENTBUS_SERVICE) protected eventBus: EventBusService,
	) {
		super({ db, ormEntityClass: ExpenseOrmEntity });
		this.eventBus = eventBus;
	}

	/**
	 * Converts a TypeORM ExpenseOrmEntity to a domain ExpenseEntity.
	 */
	public ormToDomainEntitySafe(orm: ExpenseOrmEntity): ExpenseEntity {
		return new ExpenseEntity({
			id: orm.id,
			name: orm.name,
			description: orm.description,
			notes: orm.notes,
			createdAt: orm.createdAt,
			updatedAt: orm.updatedAt,
			expendedAt: orm.expendedAt,
			expendedCents: orm.expendedCents,
			taxCents: orm.taxCents,
			categoryId: orm.categoryId,
		});
	}

	/**
	 * Converts a domain ExpenseEntity to a TypeORM ExpenseOrmEntity.
	 */
	public domainToOrmEntity(domain: ExpenseEntity): ExpenseOrmEntity {
		return {
			id: domain.id,
			name: domain.name,
			description: domain.description,
			notes: domain.notes,
			createdAt: domain.createdAt,
			updatedAt: domain.updatedAt,
			expendedAt: domain.expendedAt,
			expendedCents: domain.expendedCents,
			taxCents: domain.taxCents,
			categoryId: domain.categoryId,
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
		await this.initialized.promise;

		const qb = this.repository!.createQueryBuilder('expense');
		if (query.where?.search) {
			qb.andWhere('LOWER(expense.name) LIKE :search', {
				search: `%${query.where.search.toLowerCase()}%`,
			});
		}
		if (query.where?.year) {
			const yearStart = new Date(`${query.where.year}-01-01`);
			qb.andWhere('expense.expendedAt >= :yearStart', { yearStart });
		}
		if (query.skip) {
			qb.skip(query.skip);
		}
		if (query.limit) {
			qb.take(query.limit);
		}
		const results = await qb.getMany();
		return results.map((orm) => this.ormToDomainEntitySafe(orm));
	}
}

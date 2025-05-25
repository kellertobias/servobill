import { ExpenseEntity } from '@/backend/entities/expense.entity';
import { AbstractRepositoryInterface } from '../abstract-repository';

/**
 * Interface for all Expense repositories (DynamoDB, Postgres, SQLite).
 */
export type ExpenseRepository = AbstractRepositoryInterface<
	ExpenseEntity,
	[],
	{
		listByQuery(query: {
			where?: { search?: string; year?: number };
			skip?: number;
			limit?: number;
			cursor?: string;
		}): Promise<ExpenseEntity[]>;
	}
>;

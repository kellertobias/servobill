import { Query, Resolver, Mutation, Arg, Int, Authorized } from 'type-graphql';

import { ExpenseInput, Expense, ExpenseWhereInput } from './expenses.schema';

import { Inject, Service } from '@/common/di';
import { ExpenseRepository } from '@/backend/repositories/expense.repository';

@Service()
@Resolver(() => Expense)
export class ExpenseResolver {
	constructor(
		@Inject(ExpenseRepository) private repository: ExpenseRepository,
	) {}

	@Authorized()
	@Query(() => [Expense])
	async expenses(
		@Arg('where', { nullable: true }) where?: ExpenseWhereInput,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		@Arg('skip', () => Int, { nullable: true }) skip?: number,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		@Arg('limit', () => Int, { nullable: true }) limit?: number,
	): Promise<Expense[]> {
		const data = await this.repository.listByQuery({
			where: { ...where },
			skip,
			limit,
		});

		return data
			.filter((expense) => {
				return [
					where?.search ? expense.name.includes(where.search) : true,
					where?.year ? expense.expendedAt.getFullYear() === where.year : true,
				].every(Boolean);
			})
			.sort((a, b) => {
				// Sort by date
				return b.expendedAt.getTime() - a.expendedAt.getTime();
			});
	}

	@Authorized()
	@Mutation(() => Boolean)
	async purgeExpenses(@Arg('confirm') confirm: string): Promise<boolean> {
		if (confirm !== 'confirm') {
			throw new Error('Confirmation string is wrong');
		}
		const expenses = await this.repository.listByQuery({
			where: {},
		});
		for (const expense of expenses) {
			await this.repository.delete(expense.id);
		}

		return true;
	}

	@Authorized()
	@Query(() => Expense)
	async expense(@Arg('id') id: string): Promise<Expense | null> {
		return this.repository.getById(id);
	}

	@Authorized()
	@Mutation(() => Expense)
	async createExpense(@Arg('data') data: ExpenseInput): Promise<Expense> {
		const expense = await this.repository.create();
		expense.update(data);
		await this.repository.save(expense);

		return expense;
	}

	@Authorized()
	@Mutation(() => Expense)
	async updateExpense(
		@Arg('id') id: string,
		@Arg('data') data: ExpenseInput,
	): Promise<Expense> {
		const expense = await this.repository.getById(id);
		if (!expense) {
			throw new Error('Expense not found');
		}
		expense.update(data);
		await this.repository.save(expense);

		return expense;
	}

	@Authorized()
	@Mutation(() => Expense)
	async deleteExpense(@Arg('id') id: string): Promise<Expense> {
		const expense = await this.repository.getById(id);
		if (!expense) {
			throw new Error('Expense not found');
		}
		await this.repository.delete(id);

		return expense;
	}
}

// @vitest-environment node
// @vitest-execute serial

import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';

import { ExpenseDynamodbRepository } from './expense.dynamodb-repository';
import { ExpenseRelationalRepository } from './expense.relational-repository';
import { ExpenseOrmEntity } from './relational-orm-entity';
import { ExpenseRepository } from './interface';

import { ExpenseEntity } from '@/backend/entities/expense.entity';
import { prepareRepoTest } from '@/test/repo-test';

/**
 * Parameterized test suite for both repository implementations.
 */
const repoTestCases = prepareRepoTest({
	name: 'Expense',
	relational: ExpenseRelationalRepository,
	dynamodb: ExpenseDynamodbRepository,
	relationalOrmEntity: ExpenseOrmEntity,
});

describe.each(repoTestCases)('$name (E2E)', ({ setup, onBeforeEach }) => {
	beforeEach(async () => {
		await onBeforeEach();
	});

	it('should create, get, and delete an expense', async () => {
		const { app, RepositoryImplementation } = await setup();
		const repo = app.create<ExpenseRepository>(RepositoryImplementation);

		const expense = new ExpenseEntity({
			id: 'ex1',
			name: 'Test Expense',
			expendedCents: 1000,
			createdAt: new Date(),
			updatedAt: new Date(),
			expendedAt: new Date(),
		});
		await repo.createWithId(expense.id);
		await repo.save(expense);
		const found = await repo.getById('ex1');
		expect(found).toBeDefined();
		expect(found?.name).toBe('Test Expense');
		await repo.delete('ex1');
		const afterDelete = await repo.getById('ex1');
		expect(afterDelete).toBeNull();
	});

	it('should list expenses using listByQuery', async () => {
		const { app, RepositoryImplementation } = await setup();
		const repo = app.create<ExpenseRepository>(RepositoryImplementation);
		const expenses = [
			new ExpenseEntity({
				id: 'ex2',
				name: 'Lunch',
				expendedCents: 1500,
				createdAt: new Date(),
				updatedAt: new Date(),
				expendedAt: new Date(),
			}),
			new ExpenseEntity({
				id: 'ex3',
				name: 'Taxi',
				expendedCents: 2000,
				createdAt: new Date(),
				updatedAt: new Date(),
				expendedAt: new Date(),
			}),
			new ExpenseEntity({
				id: 'ex4',
				name: 'Hotel',
				expendedCents: 5000,
				createdAt: new Date(),
				updatedAt: new Date(),
				expendedAt: new Date(),
			}),
		];
		for (const e of expenses) {
			await repo.createWithId(e.id);
			await repo.save(e);
		}
		const all = await repo.listByQuery({});
		const allIds = all.map((e) => e.id);
		expect(allIds).toEqual(expect.arrayContaining(['ex2', 'ex3', 'ex4']));
		const searchLunch = await repo.listByQuery({ where: { search: 'lunch' } });
		expect(searchLunch.length).toBeGreaterThan(0);
		expect(searchLunch[0].name.toLowerCase()).toContain('lunch');
		const searchNone = await repo.listByQuery({ where: { search: 'xyz' } });
		expect(searchNone.length).toBe(0);
		for (const e of expenses) {
			await repo.delete(e.id);
		}
	});
});

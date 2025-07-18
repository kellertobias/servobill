import {
	Query,
	Resolver,
	Mutation,
	Arg,
	Int,
	Authorized,
	FieldResolver,
	Root,
} from 'type-graphql';

import { ExpenseCategoryType } from '../system/system.schema';
import { Attachment } from '../attachments/attachment.schema';
import { GRAPHQL_TEST_SET } from '../di-tokens';

import { ExpenseInput, Expense, ExpenseWhereInput } from './expenses.schema';

import { ATTACHMENT_REPOSITORY } from '@/backend/repositories/attachment/di-tokens';
import { type AttachmentRepository } from '@/backend/repositories/attachment/interface';
import { Inject, Service } from '@/common/di';
import { EXPENSE_REPOSITORY } from '@/backend/repositories/expense/di-tokens';
import { type ExpenseRepository } from '@/backend/repositories/expense/interface';
import { SETTINGS_REPOSITORY } from '@/backend/repositories/settings/di-tokens';
import { type SettingsRepository } from '@/backend/repositories/settings/interface';
import { ExpenseSettingsEntity } from '@/backend/entities/settings.entity';
import { Cached } from '@/backend/services/cache-decorator';
import { FILE_STORAGE_SERVICE } from '@/backend/services/file-storage.service';
import type { FileStorageService } from '@/backend/services/file-storage.service';

@Service({
	addToTestSet: [GRAPHQL_TEST_SET],
})
@Resolver(() => Expense)
export class ExpenseResolver {
	constructor(
		@Inject(FILE_STORAGE_SERVICE) private fileStorage: FileStorageService,
		@Inject(EXPENSE_REPOSITORY) private repository: ExpenseRepository,
		@Inject(SETTINGS_REPOSITORY) private settingsRepository: SettingsRepository,
		@Inject(ATTACHMENT_REPOSITORY)
		private attachmentRepository: AttachmentRepository,
	) {}

	@Authorized()
	@Query(() => [Expense])
	async expenses(
		@Arg('where', () => ExpenseWhereInput, { nullable: true })
		where?: ExpenseWhereInput,
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
	async purgeExpenses(
		@Arg('confirm', () => String) confirm: string,
	): Promise<boolean> {
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
	async expense(@Arg('id', () => String) id: string): Promise<Expense | null> {
		return this.repository.getById(id);
	}

	@Authorized()
	@Mutation(() => Expense)
	async createExpense(
		@Arg('data', () => ExpenseInput) data: ExpenseInput,
	): Promise<Expense> {
		const expense = await this.repository.create();
		expense.update(data);
		await this.repository.save(expense);

		// Link attachments
		if (data.attachmentIds) {
			for (const id of data.attachmentIds) {
				const attachment = await this.attachmentRepository.getById(id);
				if (attachment) {
					attachment.addExpenseId(expense.id);
					await this.attachmentRepository.save(attachment);
				}
			}
		}

		return expense;
	}

	@Authorized()
	@Mutation(() => Expense)
	async updateExpense(
		@Arg('id', () => String) id: string,
		@Arg('data', () => ExpenseInput) data: ExpenseInput,
	): Promise<Expense> {
		const { attachmentIds, ...newExpenseData } = data;
		const expense = await this.repository.getById(id);
		if (!expense) {
			throw new Error('Expense not found');
		}
		expense.update(newExpenseData);
		await this.repository.save(expense);

		// Link attachments
		for (const attId of attachmentIds || []) {
			const attachment = await this.attachmentRepository.getById(attId);
			if (attachment) {
				attachment.setExpenseIds([expense.id]);
				await this.attachmentRepository.save(attachment);
			}
		}

		// Remove orphaned attachments (not in attachmentIds)
		const existing = await this.attachmentRepository.listByQuery({
			expenseId: expense.id,
		});
		for (const att of existing) {
			if (!(attachmentIds || []).includes(att.id)) {
				// Get attachment details before deletion to clean up storage abstraction
				const attachment = await this.attachmentRepository.getById(att.id);
				if (!attachment) {
					continue;
				}
				attachment.removeExpenseId(expense.id);

				if (attachment.expenseIds?.length === 0) {
					if (attachment?.s3Key && attachment.s3Bucket) {
						// Delete file from storage abstraction before removing DB record
						await this.fileStorage.deleteFile(attachment.s3Key, {
							bucket: attachment.s3Bucket,
						});
					}
					await this.attachmentRepository.delete(att.id);
				} else {
					await this.attachmentRepository.save(attachment);
				}
			}
		}
		return expense;
	}

	@Authorized()
	@Mutation(() => Expense)
	async deleteExpense(@Arg('id', () => String) id: string): Promise<Expense> {
		const expense = await this.repository.getById(id);
		if (!expense) {
			throw new Error('Expense not found');
		}
		await this.repository.delete(id);

		return expense;
	}

	/**
	 * Resolves the full category object for an expense, if requested.
	 * Returns null if no categoryId is set or if the category is not found.
	 */
	@Authorized()
	@FieldResolver(() => ExpenseCategoryType, { nullable: true })
	@Cached({ getKey: (expense: Expense) => [expense.categoryId], ttl: 60 })
	async category(
		@Root() expense: Expense,
	): Promise<ExpenseCategoryType | null> {
		if (!expense.categoryId) {
			return null;
		}
		const settings = await this.settingsRepository.getSetting(
			ExpenseSettingsEntity,
		);
		const found = settings.categories.find(
			(cat) => cat.id === expense.categoryId,
		);
		return found ? { ...found } : null;
	}

	/**
	 * Field resolver for the attachments field on Expense.
	 * Fetches all attachments linked to the given expense.
	 */
	@Authorized()
	@FieldResolver(() => [Attachment], { nullable: true })
	async attachments(
		@Root() expense: Expense,
	): Promise<Attachment[] | undefined> {
		return this.attachmentRepository.listByQuery({ expenseId: expense.id });
	}
}

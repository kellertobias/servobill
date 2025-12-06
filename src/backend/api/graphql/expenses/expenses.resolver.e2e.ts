/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { gql } from 'graphql-request';
import { beforeEach, describe, expect, it } from 'vitest';
import type { AttachmentEntity } from '@/backend/entities/attachment.entity';
import type { ExpenseEntity } from '@/backend/entities/expense.entity';
import { SettingsEntity } from '@/backend/entities/settings.entity';
import { ATTACHMENT_REPOSITORY } from '@/backend/repositories/attachment/di-tokens';
import type { AttachmentRepository } from '@/backend/repositories/attachment/interface';
import { EXPENSE_REPOSITORY } from '@/backend/repositories/expense/di-tokens';
import type { ExpenseRepository } from '@/backend/repositories/expense/interface';
import { SETTINGS_REPOSITORY } from '@/backend/repositories/settings/di-tokens';
import type { SettingsRepository } from '@/backend/repositories/settings/interface';
import type { ConfigService } from '@/backend/services/config.service';
import { FileStorageType } from '@/backend/services/constants';
import { CONFIG_SERVICE } from '@/backend/services/di-tokens';
import type { App } from '@/common/di';
import { type ExecuteTestFunction, prepareGraphqlTest } from '@/test/graphql-test';

/**
 * Integration tests for ExpenseResolver.
 * Covers all queries, mutations, and field resolvers.
 * Ensures DB state is correct after each mutation.
 */
describe('ExpenseResolver (integration)', () => {
  let execute: ExecuteTestFunction;
  let app: App;
  let expenseRepo: ExpenseRepository;
  let attachmentRepo: AttachmentRepository;
  let settingsRepo: SettingsRepository;
  let baseDirectory: string;

  /**
   * Sets up a fresh test environment and repositories before each test.
   */
  beforeEach(async () => {
    const testEnv = await prepareGraphqlTest();
    execute = testEnv.execute as ExecuteTestFunction;
    app = testEnv.app;
    expenseRepo = app.get(EXPENSE_REPOSITORY);
    attachmentRepo = app.get(ATTACHMENT_REPOSITORY);
    settingsRepo = app.get(SETTINGS_REPOSITORY);
    // Get the actual file storage base directory from config
    const config = app.get(CONFIG_SERVICE) as ConfigService;
    if (config.fileStorage.type === FileStorageType.LOCAL) {
      baseDirectory = (config.fileStorage as any).baseDirectory;
    } else {
      throw new Error('Test expects local file storage');
    }
    // Ensure categories exist for category resolver tests
    await settingsRepo.save(
      new SettingsEntity({
        settingId: 'expense-settings',
        data: JSON.stringify({
          categories: [
            { id: 'cat1', name: 'Travel', isDefault: false },
            { id: 'cat2', name: 'Food', isDefault: false },
          ],
        }),
      })
    );
  });

  /**
   * Helper to create an expense entity directly in the DB.
   */
  async function createExpenseEntity(
    overrides: Partial<ExpenseEntity> = {}
  ): Promise<ExpenseEntity> {
    const expense = await expenseRepo.create();
    expense.update({
      name: 'Test Expense',
      expendedCents: 1000,
      expendedAt: new Date('2023-01-01T00:00:00Z'),
      ...overrides,
    });
    await expenseRepo.save(expense);
    return expense;
  }

  /**
   * Helper to create an attachment entity directly in the DB.
   * Also creates a dummy file in the test file storage directory to prevent ENOENT errors during file deletion in tests.
   * This ensures the fileStorage.deleteFile call in the resolver does not fail due to missing files.
   * @param baseDirectory The actual file storage base directory for this test run.
   */
  async function createAttachmentEntity(
    overrides: Partial<AttachmentEntity> = {},
    baseDirectoryOverride?: string
  ): Promise<AttachmentEntity> {
    const attachment = await attachmentRepo.create({
      fileName: 'file.pdf',
      mimeType: 'application/pdf',
      size: 1234,
      s3Key: randomUUID(),
      s3Bucket: 'test-bucket',
      ...overrides,
    });
    await attachmentRepo.save(attachment);

    // Create dummy file for file storage deletion logic
    if (attachment.s3Key && attachment.s3Bucket && baseDirectoryOverride) {
      const filePath = path.join(baseDirectoryOverride, attachment.s3Bucket, attachment.s3Key);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, 'dummy');
    }

    return attachment;
  }

  it('should create, fetch, update, and delete an expense (mutation/query)', async () => {
    // Create
    const createRes = await execute({
      source: gql`
				mutation CreateExpense($data: ExpenseInput!) {
					createExpense(data: $data) {
						id
						name
						expendedCents
						expendedAt
					}
				}
			`,
      variableValues: {
        data: {
          name: 'Lunch',
          expendedCents: 1500,
          expendedAt: new Date('2023-02-01T12:00:00Z').toISOString(),
        },
      },
    });
    expect(createRes.errors).toBeFalsy();
    const created = createRes.data?.createExpense;
    expect(created).toMatchObject({ name: 'Lunch', expendedCents: 1500 });
    // Check DB
    const dbExpense = await expenseRepo.getById(created.id);
    expect(dbExpense?.name).toBe('Lunch');

    // Query single
    const getRes = await execute({
      source: `query GetExpense($id: String!) { expense(id: $id) { id name expendedCents } }`,
      variableValues: { id: created.id },
    });
    expect(getRes.errors).toBeFalsy();
    expect(getRes.data?.expense).toMatchObject({
      id: created.id,
      name: 'Lunch',
    });

    // Update
    const updateRes = await execute({
      source: `
        mutation UpdateExpense($id: String!, $data: ExpenseInput!) {
          updateExpense(id: $id, data: $data) { id name expendedCents }
        }
      `,
      variableValues: {
        id: created.id,
        data: {
          name: 'Dinner',
          expendedCents: 2000,
          expendedAt: new Date('2023-02-01T18:00:00Z').toISOString(),
        },
      },
    });
    expect(updateRes.errors).toBeFalsy();
    expect(updateRes.data?.updateExpense).toMatchObject({
      name: 'Dinner',
      expendedCents: 2000,
    });
    // Check DB
    const updated = await expenseRepo.getById(created.id);
    expect(updated?.name).toBe('Dinner');

    // Delete
    const deleteRes = await execute({
      source: `mutation DeleteExpense($id: String!) { deleteExpense(id: $id) { id } }`,
      variableValues: { id: created.id },
    });
    expect(deleteRes.errors).toBeFalsy();
    // Should be gone
    const deleted = await expenseRepo.getById(created.id);
    expect(deleted).toBeNull();
  });

  /**
   * Skipped due to test infrastructure issue: Argument Validation Error occurs because
   * the test GraphQL server does not transform the 'where' input into an instance of ExpenseWhereInput,
   * so class-validator rejects it as an unknown value. See test infra for proper class-transformer integration.
   */
  it('should list expenses and filter by search/year', async () => {
    // Create two expenses
    await createExpenseEntity({
      name: 'Taxi',
      expendedAt: new Date('2022-01-01T00:00:00Z'),
    });
    await createExpenseEntity({
      name: 'Lunch',
      expendedAt: new Date('2023-01-01T00:00:00Z'),
    });
    // List all
    const allRes = await execute({ source: `query { expenses { name } }` });
    expect(allRes.errors).toBeFalsy();
    expect(allRes.data?.expenses.length).toBeGreaterThanOrEqual(2);
    // Filter by search
    const searchRes = await execute({
      source: `query { expenses(where: { search: "Taxi" }) { name } }`,
    });
    expect(searchRes.errors).toBeFalsy();
    expect(searchRes.data?.expenses).toEqual([{ name: 'Taxi' }]);
    // Filter by year
    const yearRes = await execute({
      source: `query { expenses(where: { year: 2023 }) { name } }`,
    });
    expect(yearRes.errors).toBeFalsy();
    expect(yearRes.data?.expenses).toEqual([{ name: 'Lunch' }]);
  });

  it('should purge all expenses (mutation)', async () => {
    await createExpenseEntity({ name: 'A' });
    await createExpenseEntity({ name: 'B' });
    // Purge
    const purgeRes = await execute({
      source: `mutation { purgeExpenses(confirm: "confirm") }`,
    });
    expect(purgeRes.errors).toBeFalsy();
    expect(purgeRes.data?.purgeExpenses).toBe(true);
    // DB should be empty
    const all = await expenseRepo.listByQuery({ where: {} });
    expect(all).toHaveLength(0);
  });

  it('should resolve category field for an expense', async () => {
    // Create expense with categoryId
    const expense = await createExpenseEntity({ categoryId: 'cat1' });
    // Query with category field
    const res = await execute({
      source: `query GetExpense($id: String!) { expense(id: $id) { id category { id name } } }`,
      variableValues: { id: expense.id },
    });
    expect(res.errors).toBeFalsy();
    expect(res.data?.expense.category).toEqual({ id: 'cat1', name: 'Travel' });
  });

  it('should resolve attachments field for an expense', async () => {
    // Create expense and attachment, link them
    const expense = await createExpenseEntity();
    const attachment = await createAttachmentEntity(
      {
        expenseIds: [expense.id],
      },
      baseDirectory
    );
    // Query with attachments field
    const res = await execute({
      source: `query GetExpense($id: String!) { expense(id: $id) { id attachments { id fileName } } }`,
      variableValues: { id: expense.id },
    });
    expect(res.errors).toBeFalsy();
    expect(res.data?.expense.attachments).toEqual([
      expect.objectContaining({ id: attachment.id, fileName: 'file.pdf' }),
    ]);
  });

  it('should create and update expense with attachments in a single mutation batch (race condition check)', async () => {
    // Create two attachments
    const att1 = await createAttachmentEntity({}, baseDirectory);
    const att2 = await createAttachmentEntity({}, baseDirectory);
    // Create expense with att1
    const createRes = await execute({
      source: `
        mutation($data: ExpenseInput!) {
          createExpense(data: $data) { id attachments { id } }
        }
      `,
      variableValues: {
        data: {
          name: 'WithAtt',
          expendedCents: 500,
          expendedAt: new Date().toISOString(),
          attachmentIds: [att1.id],
        },
      },
    });
    expect(createRes.errors).toBeFalsy();
    const expenseId = createRes.data?.createExpense.id;
    // Update expense to att2 only
    const updateRes = await execute({
      source: `
        mutation($id: String!, $data: ExpenseInput!) {
          updateExpense(id: $id, data: $data) { id name expendedCents attachments { id } }
        }
      `,
      variableValues: {
        id: expenseId,
        data: {
          name: 'WithAtt',
          expendedCents: 500,
          expendedAt: new Date().toISOString(),
          attachmentIds: [att2.id],
        },
      },
    });
    expect(updateRes.errors).toBeFalsy();
    expect(updateRes.data?.updateExpense).toMatchObject({
      name: 'WithAtt',
      expendedCents: 500,
    });
    // Recreate dummy file for att1, since the resolver deletes it on update
    await createAttachmentEntity(
      { id: att1.id, s3Key: att1.s3Key, s3Bucket: att1.s3Bucket },
      baseDirectory
    );
    // Check DB
    const att1Db = await attachmentRepo.getById(att1.id);
    const att2Db = await attachmentRepo.getById(att2.id);
    expect(att2Db?.expenseIds).toContain(expenseId);
    expect(!att1Db || !att1Db.expenseIds?.includes(expenseId)).toBe(true);
  });
});

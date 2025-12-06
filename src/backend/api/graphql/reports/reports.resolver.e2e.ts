import dayjs from 'dayjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { CustomerEntity } from '@/backend/entities/customer.entity';
import { ExpenseEntity } from '@/backend/entities/expense.entity';
import { InvoiceEntity, InvoiceStatus, InvoiceType } from '@/backend/entities/invoice.entity';
import { InvoiceItemEntity } from '@/backend/entities/invoice-item.entity';
import { SettingsEntity } from '@/backend/entities/settings.entity';
import { EXPENSE_REPOSITORY } from '@/backend/repositories/expense/di-tokens';
import type { ExpenseRepository } from '@/backend/repositories/expense/interface';
import { INVOICE_REPOSITORY } from '@/backend/repositories/invoice/di-tokens';
import type { InvoiceRepository } from '@/backend/repositories/invoice/interface';
import { SETTINGS_REPOSITORY } from '@/backend/repositories/settings/di-tokens';
import type { SettingsRepository } from '@/backend/repositories/settings/interface';
import { type ExecuteTestFunction, prepareGraphqlTest } from '@/test/graphql-test';

/**
 * Integration tests for the ReportsResolver.
 *
 * This test suite verifies the generateReport query, ensuring that the report
 * aggregates invoices and expenses correctly. It uses dependency-injected repositories
 * and a real GraphQL execution context.
 */
describe('ReportsResolver (integration)', () => {
  let execute: ExecuteTestFunction;
  let app: Awaited<ReturnType<typeof prepareGraphqlTest>>['app'];

  beforeEach(async () => {
    // Prepare a fresh GraphQL test context for each test
    const result = await prepareGraphqlTest();
    execute = result.execute;
    app = result.app;
    // No repository clear needed: DB is wiped by prepareGraphqlTest
  });

  it('should generate a correct income/expense report for a given period', async () => {
    // Arrange: Set up test data for invoices, expenses, and settings
    const invoiceRepo = app.get<InvoiceRepository>(INVOICE_REPOSITORY);
    const expenseRepo = app.get<ExpenseRepository>(EXPENSE_REPOSITORY);
    const settingsRepo = app.get<SettingsRepository>(SETTINGS_REPOSITORY);

    // Save settings with one expense category (must use SettingsEntity, not ExpenseSettingsEntity)
    const categories = [
      {
        id: 'cat1',
        name: 'Office',
        color: '#f00',
        description: 'Office expenses',
        isDefault: true,
      },
    ];
    await settingsRepo.save(
      new SettingsEntity({
        settingId: 'expense-settings',
        data: JSON.stringify({ categories }),
      })
    );

    // Create a customer for the invoice
    const customer = new CustomerEntity({
      id: 'cust1',
      name: 'Test Customer',
      customerNumber: 'CUST-001',
      showContact: false,
      createdAt: dayjs('2024-01-01').toDate(),
      updatedAt: dayjs('2024-01-01').toDate(),
    });

    // Create a paid invoice (must provide required fields)
    const invoice = new InvoiceEntity({
      id: 'inv1',
      invoiceNumber: '2024-001',
      type: InvoiceType.INVOICE,
      status: InvoiceStatus.PAID,
      invoicedAt: dayjs('2024-01-10').toDate(),
      dueAt: dayjs('2024-01-20').toDate(),
      totalCents: 10000,
      totalTax: 1900,
      paidCents: 10000,
      createdAt: dayjs('2024-01-05').toDate(),
      updatedAt: dayjs('2024-01-10').toDate(),
      customer,
      items: [
        new InvoiceItemEntity({
          id: 'item1',
          name: 'Consulting',
          quantity: 1,
          priceCents: 10000,
          taxPercentage: 19,
        }),
      ],
      activity: [],
      submissions: [],
    });
    await invoiceRepo.save(invoice);

    // Create an expense (must provide required fields, no 'year')
    const expense = new ExpenseEntity({
      id: 'exp1',
      name: 'Printer Paper',
      description: 'A4 sheets',
      expendedAt: dayjs('2024-01-15').toDate(),
      expendedCents: 2000,
      taxCents: 380,
      categoryId: 'cat1',
      createdAt: dayjs('2024-01-14').toDate(),
      updatedAt: dayjs('2024-01-15').toDate(),
    });
    await expenseRepo.save(expense);

    // Act: Execute the generateReport query
    const query = `
      query GenerateReport($where: IncomeSurplusReportWhereInput) {
        generateReport(where: $where) {
          startDate
          endDate
          incomeCents
          expensesCents
          surplusCents
          overdueCents
          overdueInvoices
          openCents
          openInvoices
          invoiceTaxCents
          expensesTaxCents
          items {
            id
            type
            name
            surplusCents
            taxCents
            category { id name }
          }
        }
      }
    `;
    const variables = {
      where: {
        startDate: dayjs('2024-01-01').toISOString(),
        endDate: dayjs('2024-12-31').toISOString(),
      },
    };
    const result = await execute({
      source: query,
      variableValues: variables,
      // contextValue can be provided if needed
    });

    // Assert: The report should reflect the test data
    expect(result.errors).toBeFalsy();
    const report = result.data.generateReport;
    expect(report).toBeTruthy();
    expect(report.incomeCents).toBe(10000);
    expect(report.expensesCents).toBe(2000);
    expect(report.surplusCents).toBe(8000);
    expect(report.invoiceTaxCents).toBe(1900);
    expect(report.expensesTaxCents).toBe(380);
    expect(report.items).toHaveLength(2);
    // Check that the invoice and expense are present in the report items
    const invoiceItem = report.items.find((i: { type: string }) => i.type === 'invoice');
    const expenseItem = report.items.find((i: { type: string }) => i.type === 'expense');
    expect(invoiceItem).toMatchObject({
      id: 'inv1',
      name: '2024-001',
      surplusCents: 10000,
      taxCents: 1900,
    });
    expect(expenseItem).toMatchObject({
      id: 'exp1',
      name: 'Printer Paper',
      surplusCents: -2000,
      taxCents: -380,
      category: { id: 'cat1', name: 'Office' },
    });

    // Assert: The data is stored in the repositories
    const storedInvoice = await invoiceRepo.getById('inv1');
    const storedExpense = await expenseRepo.getById('exp1');
    expect(storedInvoice).toBeTruthy();
    expect(storedExpense).toBeTruthy();
  });
});

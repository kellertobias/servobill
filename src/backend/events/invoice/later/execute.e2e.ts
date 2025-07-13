/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from 'vitest';

import { HandlerExecution } from './execute';
import { InvoiceSendLaterEvent } from './event';

import { InvoiceSubmissionType } from '@/backend/entities/invoice-submission.entity';
import { InvoiceSettingsEntity } from '@/backend/entities/settings.entity';
import type { InvoiceRepository } from '@/backend/repositories/invoice/interface';
import type { SettingsRepository } from '@/backend/repositories/settings/interface';
import type { ExpenseRepository } from '@/backend/repositories/expense/interface';

/**
 * Mocks and helpers for the test
 */
// Define a minimal Invoice type for the test context
interface TestInvoice {
	id: string;
	scheduledSendJobId?: string;
	submissions: Array<
		Record<string, unknown> & {
			isScheduled?: boolean;
			isCancelled?: boolean;
			type?: string;
			scheduledSendJobId?: string;
		}
	>;
	addSubmission: (
		submission: unknown,
		userName: string,
		settingsLoader: unknown,
	) => Promise<void>;
	createAndLinkExpensesForInvoice: (
		cb: (data: unknown) => Promise<unknown>,
	) => Promise<void>;
}

class MockInvoiceRepository {
	public invoices: TestInvoice[] = [];
	async getById(id: string): Promise<TestInvoice | null> {
		return this.invoices.find((inv) => inv.id === id) || null;
	}
	async save(invoice: TestInvoice): Promise<void> {
		// Simulate save by replacing the invoice in the array
		const idx = this.invoices.findIndex((inv) => inv.id === invoice.id);
		if (idx === -1) {
			this.invoices.push(invoice);
		} else {
			this.invoices[idx] = invoice;
		}
	}
	// Dummy implementations for interface completeness
	async createWithId(): Promise<any> {
		throw new Error('Not implemented');
	}
	async create(): Promise<any> {
		throw new Error('Not implemented');
	}
	async delete(): Promise<any> {
		throw new Error('Not implemented');
	}
	async find(): Promise<any> {
		throw new Error('Not implemented');
	}
	async findByCustomerId(): Promise<any> {
		throw new Error('Not implemented');
	}
	async findBySubmissionId(): Promise<any> {
		throw new Error('Not implemented');
	}
	async findByIds(): Promise<any> {
		throw new Error('Not implemented');
	}
	async findByStatus(): Promise<any> {
		throw new Error('Not implemented');
	}
	async findByNumber(): Promise<any> {
		throw new Error('Not implemented');
	}
	async findByCustomerAndNumber(): Promise<any> {
		throw new Error('Not implemented');
	}
	async findByScheduledSendJobId(): Promise<any> {
		throw new Error('Not implemented');
	}
}

class MockSettingsRepository {
	async getSetting(_entity: unknown): Promise<InvoiceSettingsEntity> {
		// Always return a settings entity
		return {} as unknown as InvoiceSettingsEntity;
	}
	// Dummy implementations for interface completeness
	async save(): Promise<any> {
		throw new Error('Not implemented');
	}
	async getAll(): Promise<any> {
		throw new Error('Not implemented');
	}
}

class MockExpenseRepository {
	public created: object[] = [];
	async create(): Promise<{
		update: (data: object) => void;
		save: () => Promise<void>;
	}> {
		const expense = {
			update: (_: object) => {},
			save: async () => {},
		};
		this.created.push(expense);
		return expense;
	}
	async save(_: object): Promise<void> {
		// No-op for this mock
	}
	// Dummy implementations for interface completeness
	async getById(): Promise<any> {
		throw new Error('Not implemented');
	}
	async find(): Promise<any> {
		throw new Error('Not implemented');
	}
	async delete(): Promise<any> {
		throw new Error('Not implemented');
	}
}

/**
 * Helper to create a mock invoice with a scheduled submission
 */
function createMockInvoice({
	id,
	scheduledJobId,
	isCancelled = false,
}: {
	id: string;
	scheduledJobId?: string;
	isCancelled?: boolean;
}): TestInvoice {
	return {
		id,
		scheduledSendJobId: scheduledJobId,
		submissions: [
			{
				scheduledSendJobId: scheduledJobId,
				isScheduled: true,
				isCancelled,
			},
		],
		addSubmission: async function (submission: unknown) {
			this.submissions.push(submission as Record<string, unknown>);
		},
		createAndLinkExpensesForInvoice: async function (
			cb: (data: unknown) => Promise<unknown>,
		) {
			await cb({});
		},
	};
}

/**
 * Helper to generate required event fields for InvoiceSendLaterEvent
 */
function makeEventFields(invoiceId: string, userName: string) {
	return {
		id: 'event-' + Math.random().toString(36).slice(2),
		invoiceId,
		userName,
		submissionId: 'sub-' + Math.random().toString(36).slice(2),
	};
}

/**
 * E2E test suite for HandlerExecution.execute
 *
 * This test verifies the correct handling of the 'send later' invoice event, including:
 * - Removing the scheduled submission
 * - Adding a new EMAIL submission
 * - Creating and linking expenses
 * - Saving the invoice
 * - Handling error cases (invoice not found, no scheduled job, etc.)
 */
describe('HandlerExecution (send later invoice event) E2E', () => {
	let invoiceRepository: MockInvoiceRepository;
	let settingsRepository: MockSettingsRepository;
	let expenseRepository: MockExpenseRepository;
	let handler: HandlerExecution;

	beforeEach(() => {
		invoiceRepository = new MockInvoiceRepository();
		settingsRepository = new MockSettingsRepository();
		expenseRepository = new MockExpenseRepository();
		handler = new HandlerExecution(
			invoiceRepository as unknown as InvoiceRepository,
			settingsRepository as unknown as SettingsRepository,
			expenseRepository as unknown as ExpenseRepository,
		);
	});

	it('should process the event, remove scheduled submission, add EMAIL submission, and create expenses', async () => {
		// Arrange: create a mock invoice with a scheduled submission
		const invoiceId = 'inv-1';
		const scheduledJobId = 'job-123';
		const invoice = createMockInvoice({ id: invoiceId, scheduledJobId });
		invoiceRepository.invoices.push(invoice);

		const event = new InvoiceSendLaterEvent(
			makeEventFields(invoiceId, 'test-user'),
		);

		// Act
		await handler.execute(event);

		// Assert: scheduled submission is removed
		expect(invoice.submissions.find((s) => s.isScheduled)).toBeUndefined();
		// Assert: EMAIL submission is added
		expect(
			invoice.submissions.some((s) => s.type === InvoiceSubmissionType.EMAIL),
		).toBe(true);
		// Assert: expense was created
		expect(expenseRepository.created.length).toBe(1);
	});

	it('should throw if invoice not found', async () => {
		const event = new InvoiceSendLaterEvent(
			makeEventFields('not-exist', 'test-user'),
		);
		await expect(handler.execute(event)).rejects.toThrow('Invoice not found');
	});

	it('should throw if no scheduled job found', async () => {
		const invoice = createMockInvoice({
			id: 'inv-2',
			scheduledJobId: undefined,
		});
		invoiceRepository.invoices.push(invoice);
		const event = new InvoiceSendLaterEvent(
			makeEventFields('inv-2', 'test-user'),
		);
		await expect(handler.execute(event)).rejects.toThrow(
			'No scheduled job found for this invoice',
		);
	});

	it('should throw if original scheduled submission not found', async () => {
		const invoice = createMockInvoice({ id: 'inv-3', scheduledJobId: 'job-x' });
		invoice.submissions = []; // No scheduled submission
		invoiceRepository.invoices.push(invoice);
		const event = new InvoiceSendLaterEvent(
			makeEventFields('inv-3', 'test-user'),
		);
		await expect(handler.execute(event)).rejects.toThrow(
			'Original scheduled submission not found',
		);
	});

	it('should throw if original scheduled submission is already cancelled', async () => {
		const invoice = createMockInvoice({
			id: 'inv-4',
			scheduledJobId: 'job-y',
			isCancelled: true,
		});
		invoiceRepository.invoices.push(invoice);
		const event = new InvoiceSendLaterEvent(
			makeEventFields('inv-4', 'test-user'),
		);
		await expect(handler.execute(event)).rejects.toThrow(
			'Original scheduled submission is already cancelled',
		);
	});
});

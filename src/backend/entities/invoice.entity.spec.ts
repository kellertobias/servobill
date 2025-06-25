/**
 * @file Unit tests for InvoiceEntity using real entities (no mocks).
 *
 * These tests focus on the core business logic of InvoiceEntity, using the actual entity implementations.
 * The goal is to verify correct behavior of invoice state transitions, content hash management, PDF requests,
 * and activity/event tracking, without any mocking of dependencies.
 *
 * Dependency Injection is used for settings and other dependencies as per project rules.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { InvoiceEntity, InvoiceStatus, InvoiceType } from './invoice.entity';
import { InvoiceSettingsEntity } from './settings.entity';
import { CustomerEntity } from './customer.entity';
import { InvoiceItemEntity } from './invoice-item.entity';
import {
	InvoiceActivityEntity,
	InvoiceActivityType,
} from './invoice-activity.entity';
import {
	InvoiceSubmissionEntity,
	InvoiceSubmissionType,
} from './invoice-submission.entity';

/**
 * Helper to create a real InvoiceSettingsEntity with predictable number generation.
 * This ensures deterministic tests for number assignment logic.
 */
function createTestSettings(): InvoiceSettingsEntity {
	const settings = new InvoiceSettingsEntity(
		{
			invoiceNumbers: {
				template: '[INV]-###',
				incrementTemplate: '[INV]-###',
				lastNumber: '[INV]-001',
			},
			offerNumbers: {
				template: '',
				incrementTemplate: '',
				lastNumber: '0',
			},
			customerNumbers: {
				template: '',
				incrementTemplate: '',
				lastNumber: '0',
			},
			defaultInvoiceDueDays: 14,
			offerValidityDays: 7,
			defaultInvoiceFooterText: '',
		},
		() => Promise.resolve(),
	);
	return settings;
}

// Move getSettings to outer scope for linter compliance
const getSettings = async () => createTestSettings();

describe('InvoiceEntity', () => {
	let invoice: InvoiceEntity;
	let customer: CustomerEntity;
	let items: InvoiceItemEntity[];

	beforeEach(() => {
		/**
		 * Sets up a fresh InvoiceEntity and dependencies before each test.
		 * Ensures test isolation and repeatability using real entities.
		 */
		customer = new CustomerEntity({
			id: 'cust-1',
			name: 'Test Customer',
			customerNumber: 'CUST-001',
			showContact: false,
			email: '',
			notes: '',
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		items = [
			new InvoiceItemEntity({
				id: 'item-1',
				name: 'Test Item',
				quantity: 1,
				priceCents: 1000,
				taxPercentage: 20,
			}),
			new InvoiceItemEntity({
				id: 'item-2',
				name: 'Test Item 2',
				quantity: 2,
				priceCents: 2000,
				taxPercentage: 10,
			}),
		];
		invoice = new InvoiceEntity({
			id: 'inv-1',
			type: InvoiceType.INVOICE,
			status: InvoiceStatus.DRAFT,
			submissions: [],
			customer,
			createdAt: new Date(),
			updatedAt: new Date(),
			items,
			totalCents: 0,
			totalTax: 0,
			activity: [],
		});
	});

	/**
	 * Verifies that updating invoice items changes the content hash.
	 * This ensures the hash reflects the current invoice state for PDF generation and change tracking.
	 */
	it('should update content hash when items change', () => {
		invoice.updateItems(items);
		const hash1 = invoice.contentHash;
		invoice.updateItems([
			new InvoiceItemEntity({
				id: 'item-3',
				name: 'Another Item',
				quantity: 1,
				priceCents: 500,
				taxPercentage: 5,
			}),
		]);
		expect(invoice.contentHash).not.toBe(hash1);
	});

	/**
	 * Ensures that requesting a PDF without a content hash throws an error.
	 * This prevents generating PDFs for incomplete or invalid invoice states.
	 */
	it('should throw when requesting PDF without content hash', () => {
		invoice.contentHash = undefined;
		expect(() => invoice.requestPdf()).toThrowError();
	});

	/**
	 * Checks that requestPdf sets the pdf property and adds an event.
	 * This validates the correct workflow for PDF generation requests.
	 */
	it('should set pdf property and add event on requestPdf', () => {
		invoice.updateItems(items);
		const hash = invoice.requestPdf();
		expect(invoice.pdf).toBeDefined();
		expect(invoice.pdf?.forContentHash).toBe(hash);
	});

	/**
	 * Tests the full flow of adding an email submission to a draft invoice.
	 * Verifies status transition, number assignment, and date updates.
	 */
	it('should update status, number, and dates on first email submission', async () => {
		const submission = new InvoiceSubmissionEntity({
			id: 'sub-id',
			type: InvoiceSubmissionType.EMAIL,
			submittedAt: new Date(),
		});
		const activity = await invoice.addSubmission(
			submission,
			'Alice',
			getSettings,
		);
		expect(invoice.status).toBe(InvoiceStatus.SENT);
		expect(invoice.invoiceNumber).toBe('INV-001');
		expect(invoice.invoicedAt).toBeInstanceOf(Date);
		expect(invoice.dueAt).toBeInstanceOf(Date);
		expect(activity).toBeInstanceOf(InvoiceActivityEntity);
	});

	it('should update paidCents, paidAt, paidVia, and status on addPayment', () => {
		invoice.totalCents = 1000;
		const activity = invoice.addPayment(
			{ paidCents: 1000, paidAt: new Date(), paidVia: 'bank' },
			'Bob',
		);
		expect(invoice.paidCents).toBe(1000);
		expect(invoice.paidVia).toBe('bank');
		expect(invoice.status).toBe(InvoiceStatus.PAID);
		expect(activity).toBeInstanceOf(InvoiceActivityEntity);
	});

	it('should throw if trying to cancel from non-SENT status', () => {
		invoice.status = InvoiceStatus.DRAFT;
		expect(() =>
			invoice.updateStatus(InvoiceStatus.CANCELLED, 'Bob'),
		).toThrowError();
	});

	it('should set status to CANCELLED and add activity if from SENT', () => {
		invoice.status = InvoiceStatus.SENT;
		const activity = invoice.updateStatus(InvoiceStatus.CANCELLED, 'Bob');
		expect(invoice.status).toBe(InvoiceStatus.CANCELLED);
		expect(activity).toBeInstanceOf(InvoiceActivityEntity);
	});

	it('should track processed event IDs', () => {
		const eventId = 'evt-123';
		expect(invoice.hasProcessedEvent(eventId)).toBe(false);
		invoice.markEventAsProcessed(eventId);
		expect(invoice.hasProcessedEvent(eventId)).toBe(true);
	});

	/**
	 * Ensures updateDates updates dates in DRAFT status and throws in invalid status.
	 */
	it('should update dates in DRAFT status', () => {
		const newDates = {
			offeredAt: new Date('2023-01-01'),
			invoicedAt: new Date('2023-01-02'),
			dueAt: new Date('2023-01-03'),
		};
		invoice.status = InvoiceStatus.DRAFT;
		invoice.updateDates(newDates);
		expect(invoice.offeredAt).toEqual(newDates.offeredAt);
		expect(invoice.invoicedAt).toEqual(newDates.invoicedAt);
		expect(invoice.dueAt).toEqual(newDates.dueAt);
	});

	/**
	 * Ensures updateDates throws if status is not DRAFT or SENT.
	 */
	it('should throw in updateDates if status is not DRAFT or SENT', () => {
		invoice.status = InvoiceStatus.PAID;
		expect(() => invoice.updateDates({ dueAt: new Date() })).toThrowError();
	});

	/**
	 * Ensures updateTexts updates subject and footerText.
	 */
	it('should update subject and footerText with updateTexts', () => {
		invoice.updateTexts({ subject: 'New Subject', footerText: 'Footer' });
		expect(invoice.subject).toBe('New Subject');
		expect(invoice.footerText).toBe('Footer');
	});

	/**
	 * Ensures updateCustomer updates the customer and content hash.
	 */
	it('should update customer with updateCustomer', () => {
		const newCustomer = new CustomerEntity({
			id: 'cust-2',
			name: 'Other Customer',
			customerNumber: 'CUST-002',
			showContact: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		const oldHash = invoice.contentHash;
		invoice.updateCustomer(newCustomer);
		expect(invoice.customer).toBe(newCustomer);
		expect(invoice.contentHash).not.toBe(oldHash);
	});

	/**
	 * Ensures updatePdf sets the pdf property if contentHash exists, throws otherwise.
	 */
	it('should set pdf property with updatePdf if contentHash exists', () => {
		invoice.updateItems(items);
		invoice.updatePdf({ bucket: 'b', region: 'r', key: 'k' });
		expect(invoice.pdf).toMatchObject({ bucket: 'b', region: 'r', key: 'k' });
	});

	it('should throw in updatePdf if contentHash is missing', () => {
		invoice.contentHash = undefined;
		expect(() =>
			invoice.updatePdf({ bucket: 'b', region: 'r', key: 'k' }),
		).toThrowError();
	});

	/**
	 * Ensures addActivity adds an activity to the invoice.
	 */
	it('should add activity with addActivity', () => {
		const activity = new InvoiceActivityEntity({
			user: 'Alice',
			type: InvoiceActivityType.NOTE,
		});
		invoice.addActivity(activity);
		expect(invoice.activity).toContain(activity);
	});

	/**
	 * Ensures partial payment sets status to PAID_PARTIALLY.
	 */
	it('should set status to PAID_PARTIALLY on partial payment', () => {
		invoice.totalCents = 2000;
		invoice.addPayment(
			{ paidCents: 1000, paidAt: new Date(), paidVia: 'cash' },
			'Bob',
		);
		expect(invoice.status).toBe(InvoiceStatus.PAID_PARTIALLY);
	});

	/**
	 * Ensures overpayment still sets status to PAID.
	 */
	it('should set status to PAID on overpayment', () => {
		invoice.totalCents = 1000;
		invoice.addPayment(
			{ paidCents: 1500, paidAt: new Date(), paidVia: 'cash' },
			'Bob',
		);
		expect(invoice.status).toBe(InvoiceStatus.PAID);
	});

	/**
	 * Ensures updateItems throws if status is not DRAFT.
	 */
	it('should throw in updateItems if status is not DRAFT', () => {
		invoice.status = InvoiceStatus.SENT;
		expect(() => invoice.updateItems(items)).toThrowError();
	});
});

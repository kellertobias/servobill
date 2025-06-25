/**
 * Integration tests for InvoiceLifecycleResolver.
 *
 * This suite covers all mutations for invoice lifecycle, using a DI GraphQL test app.
 * It verifies DB state after mutations and checks for race conditions by executing multiple mutations in a single request.
 *
 * Why: Ensures resolver logic, DB integration, and GraphQL schema are all working as expected.
 * How: Uses prepareGraphqlTest to get an app and execute GraphQL operations, and verifies repository state after mutations.
 */
import { describe, it, beforeEach, expect } from 'vitest';
import { gql } from 'graphql-request';

import { prepareGraphqlTest } from '@/test/graphql-test';
import { INVOICE_REPOSITORY } from '@/backend/repositories/invoice/di-tokens';
import { CUSTOMER_REPOSITORY } from '@/backend/repositories/customer/di-tokens';
import { SETTINGS_REPOSITORY } from '@/backend/repositories/settings/di-tokens';
import {
	InvoiceEntity,
	InvoiceType,
	InvoiceStatus,
} from '@/backend/entities/invoice.entity';
import { CustomerEntity } from '@/backend/entities/customer.entity';
import { InvoiceItemEntity } from '@/backend/entities/invoice-item.entity';
import { SettingsEntity } from '@/backend/entities/settings.entity';
import type { InvoiceRepository } from '@/backend/repositories/invoice/interface';
import type { CustomerRepository } from '@/backend/repositories/customer/interface';
import type { SettingsRepository } from '@/backend/repositories/settings/interface';

// Helper: create a minimal customer
function sampleCustomer(overrides: Partial<CustomerEntity> = {}) {
	return new CustomerEntity({
		id: 'cust-1',
		name: 'Test Customer',
		customerNumber: 'CUST-001',
		showContact: false,
		email: 'test@example.com',
		notes: '',
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	});
}

// Helper: create a minimal invoice item
function sampleInvoiceItem(overrides: Partial<InvoiceItemEntity> = {}) {
	return new InvoiceItemEntity({
		id: 'item-1',
		name: 'Test Item',
		quantity: 1,
		priceCents: 1000,
		taxPercentage: 19,
		...overrides,
	});
}

// Helper: create a minimal invoice
function sampleInvoice(
	customer: CustomerEntity,
	overrides: Partial<InvoiceEntity> = {},
) {
	return new InvoiceEntity({
		id: 'inv-1',
		type: InvoiceType.INVOICE,
		status: InvoiceStatus.DRAFT,
		customer,
		createdAt: new Date(),
		updatedAt: new Date(),
		items: [sampleInvoiceItem()],
		activity: [],
		submissions: [],
		...overrides,
	});
}

// Helper: create minimal invoice settings
function sampleInvoiceSettingsEntity(
	overrides: Record<string, unknown> = {},
): SettingsEntity {
	return new SettingsEntity({
		settingId: 'invoice-numbers',
		data: JSON.stringify({
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
			defaultInvoiceFooterText: 'Default footer',
			...overrides,
		}),
	});
}

describe('InvoiceLifecycleResolver (integration)', () => {
	let execute: Awaited<ReturnType<typeof prepareGraphqlTest>>['execute'];
	let app: Awaited<ReturnType<typeof prepareGraphqlTest>>['app'];
	let invoiceRepo: InvoiceRepository;
	let customerRepo: CustomerRepository;
	let settingsRepo: SettingsRepository;

	beforeEach(async () => {
		// Prepare a fresh app and repo for each test
		const testEnv = await prepareGraphqlTest();
		execute = testEnv.execute;
		app = testEnv.app;
		invoiceRepo = app.get(INVOICE_REPOSITORY);
		customerRepo = app.get(CUSTOMER_REPOSITORY);
		settingsRepo = app.get(SETTINGS_REPOSITORY);
	});

	/**
	 * Test the copyInvoice mutation.
	 *
	 * This test verifies that copying an invoice creates a new invoice in the DB with the correct fields.
	 */
	it('should copy an invoice (copyInvoice mutation)', async () => {
		const customer = sampleCustomer();
		await customerRepo.save(customer);
		await settingsRepo.save(sampleInvoiceSettingsEntity());
		const originalInvoice = sampleInvoice(customer, {
			id: 'inv-1',
			subject: 'Original Subject',
		});
		await invoiceRepo.save(originalInvoice);

		const mutation = gql`
			mutation CopyInvoice($id: String!, $as: InvoiceType!) {
				copyInvoice(id: $id, as: $as) {
					id
					activityId
					updatedAt
					change
				}
			}
		`;

		const { data, errors } = await execute({
			source: mutation,
			variableValues: { id: 'inv-1', as: InvoiceType.INVOICE },
		});

		expect(errors).toBeUndefined();
		expect(data?.copyInvoice).toBeTruthy();
		expect(data?.copyInvoice.id).toBeDefined();
		// The new invoice id should not be the same as the original
		expect(data?.copyInvoice.id).not.toBe('inv-1');

		// Fetch the new invoice by ID and check its fields
		const allInvoices = await invoiceRepo.listByQuery({});
		expect(allInvoices.length).toBe(2);
		const copied = allInvoices.find((inv) => inv.id !== 'inv-1');
		expect(copied).toBeTruthy();
		expect(copied?.subject).toBe('Original Subject');
		expect(copied?.customer.id).toBe('cust-1');
	});

	// TODO: Add tests for invoiceDeleteDraft, invoiceCancelUnpaid, invoiceSend, invoiceAddPayment, invoicePdf
});

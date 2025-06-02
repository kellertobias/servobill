// @vitest-environment node
// @vitest-execute serial

import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';

import { InvoiceDynamodbRepository } from './invoice.dynamodb-repository';
import { InvoiceRelationalRepository } from './invoice.relational-repository';
import { InvoiceOrmEntity } from './relational-orm-entity';
import { InvoiceRepository } from './interface';

import { InvoiceItemEntity } from '@/backend/entities/invoice-item.entity';
import { CustomerEntity } from '@/backend/entities/customer.entity';
import {
	InvoiceEntity,
	InvoiceType,
	InvoiceStatus,
} from '@/backend/entities/invoice.entity';
import { prepareRepoTest } from '@/test/repo-test';

/**
 * Parameterized test suite for both repository implementations.
 */
describe.each(
	prepareRepoTest({
		name: 'Invoice',
		relational: InvoiceRelationalRepository,
		dynamodb: InvoiceDynamodbRepository,
		relationalOrmEntity: InvoiceOrmEntity,
	}),
)('$name (E2E)', ({ setup, name, onBeforeEach }) => {
	beforeEach(async () => {
		await onBeforeEach();
	});

	it('should create, get, and delete an invoice', async () => {
		const { app, RepositoryImplementation } = await setup();
		const repo = app.create<InvoiceRepository>(RepositoryImplementation);

		const customer = new CustomerEntity({
			id: 'cust1',
			name: 'Customer 1',
			customerNumber: 'CUST-001',
			showContact: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		const items = [
			new InvoiceItemEntity({
				id: 'item1',
				name: 'Service',
				quantity: 1,
				priceCents: 1000,
				taxPercentage: 19,
			}),
		];
		const invoice = new InvoiceEntity({
			id: 'inv1',
			type: InvoiceType.INVOICE,
			status: InvoiceStatus.DRAFT,
			customer,
			items,
			totalCents: 1000,
			totalTax: 190,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		if (name === 'InvoiceDynamodbRepository') {
			await repo.createWithId(
				invoice.id,
				invoice.type,
				invoice.customer,
				'test-user',
			);
		}
		await repo.save(invoice);
		const found = await repo.getById('inv1');
		expect(found).toBeDefined();
		expect(found?.customer.name).toBe('Customer 1');
		await repo.delete('inv1');
		const afterDelete = await repo.getById('inv1');
		expect(afterDelete).toBeNull();
	});

	it('should list invoices using listByQuery', async () => {
		const { app, RepositoryImplementation } = await setup();
		const repo = app.create<InvoiceRepository>(RepositoryImplementation);
		const customer = new CustomerEntity({
			id: 'cust2',
			name: 'Customer 2',
			customerNumber: 'CUST-002',
			showContact: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		const items = [
			new InvoiceItemEntity({
				id: 'item2',
				name: 'Consulting',
				quantity: 2,
				priceCents: 2000,
				taxPercentage: 19,
			}),
		];
		const invoices = [
			new InvoiceEntity({
				id: 'inv2',
				type: InvoiceType.INVOICE,
				status: InvoiceStatus.DRAFT,
				customer,
				items,
				totalCents: 4000,
				totalTax: 760,
				createdAt: new Date(),
				updatedAt: new Date(),
			}),
			new InvoiceEntity({
				id: 'inv3',
				type: InvoiceType.OFFER,
				status: InvoiceStatus.DRAFT,
				customer,
				items,
				totalCents: 2000,
				totalTax: 380,
				createdAt: new Date(),
				updatedAt: new Date(),
			}),
		];
		for (const inv of invoices) {
			await repo.createWithId(inv.id, inv.type, inv.customer, 'test-user');
			await repo.save(inv);
		}
		const all = await repo.listByQuery({});
		const allIds = all.map((inv: InvoiceEntity) => inv.id);
		expect(allIds).toEqual(expect.arrayContaining(['inv2', 'inv3']));
		const onlyOffers = await repo.listByQuery({
			where: { type: InvoiceType.OFFER },
		});
		expect(onlyOffers.length).toBeGreaterThan(0);
		expect(onlyOffers[0].type).toBe(InvoiceType.OFFER);
		const onlyDrafts = await repo.listByQuery({
			where: { status: InvoiceStatus.DRAFT },
		});
		expect(onlyDrafts.length).toBeGreaterThan(0);
		expect(onlyDrafts[0].status).toBe(InvoiceStatus.DRAFT);
		const thisYear = new Date().getFullYear();
		const byYear = await repo.listByQuery({ where: { year: thisYear } });
		expect(byYear.length).toBeGreaterThan(0);
		const searchNone = await repo.listByQuery({
			where: { type: InvoiceType.OFFER, status: InvoiceStatus.PAID },
		});
		expect(searchNone.length).toBe(0);
		for (const inv of invoices) {
			await repo.delete(inv.id);
		}
	});
});

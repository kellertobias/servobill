// @vitest-environment node
// @vitest-execute serial

import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import {
	InvoiceEntity,
	InvoiceType,
	InvoiceStatus,
} from '@/backend/entities/invoice.entity';
import { CustomerEntity } from '@/backend/entities/customer.entity';
import { InvoiceItemEntity } from '@/backend/entities/invoice-item.entity';
import { DatabaseType } from '@/backend/services/constants';
import { InvoiceDynamodbRepository } from './invoice.dynamodb-repository';
import { InvoiceRelationalRepository } from './invoice.relational-repository';
import { DynamoDBService } from '@/backend/services/dynamodb.service';
import { RelationalDbService } from '@/backend/services/relationaldb.service';
import { InvoiceOrmEntity } from './relational-orm-entity';
import {
	DYNAMODB_PORT,
	POSTGRES_PORT,
	POSTGRES_USER,
	POSTGRES_PASSWORD,
	POSTGRES_DB,
} from '@/test/vitest.setup-e2e';
import { App } from '@/common/di';
import { CONFIG_SERVICE } from '@/backend/services/di-tokens';
import {
	ensureDynamoTableExists,
	DYNAMODB_TABLE_NAME,
} from '@/test/ensure-dynamo-table';
import { InvoiceRepository } from './interface';
import { clearDynamoTable } from '@/test/clear-dynamo-table';

/**
 * Parameterized test suite for both repository implementations.
 */
describe.each([
	{
		dbType: DatabaseType.DYNAMODB,
		name: 'InvoiceDynamodbRepository',
		setup: async () => {
			await ensureDynamoTableExists();
			const config = {
				tables: {
					electordb: DYNAMODB_TABLE_NAME,
					databaseType: DatabaseType.DYNAMODB,
				},
				endpoints: {
					dynamodb: `http://localhost:${DYNAMODB_PORT}`,
				},
				region: 'eu-central-1',
				awsCreds: {
					accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
					secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
				},
				port: 0,
				domains: { api: '', site: '' },
				eventBusName: '',
				buckets: { files: '' },
				isLocal: true,
				ses: { accessKeyId: '', secretAccessKey: '' },
			};
			const app = App.forRoot({
				modules: [
					{ token: CONFIG_SERVICE, value: config },
					{ token: DynamoDBService, module: DynamoDBService },
					DynamoDBService,
				],
			});
			return {
				app,
				InvoiceRepositoryImplementation: InvoiceDynamodbRepository,
			};
		},
	},
	{
		dbType: DatabaseType.POSTGRES,
		name: 'InvoiceRelationalRepository',
		setup: async () => {
			const { OrmEntityRegistry } = await import(
				'@/common/orm-entity-registry'
			);
			OrmEntityRegistry.push(InvoiceOrmEntity);
			await new Promise((res) => setTimeout(res, 1000));
			const config = {
				tables: {
					databaseType: DatabaseType.POSTGRES,
					postgres: `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}`,
				},
				endpoints: {},
				region: 'eu-central-1',
				awsCreds: { accessKeyId: '', secretAccessKey: '' },
				port: 0,
				domains: { api: '', site: '' },
				eventBusName: '',
				buckets: { files: '' },
				isLocal: true,
				ses: { accessKeyId: '', secretAccessKey: '' },
			};
			const app = App.forRoot({
				modules: [
					{ token: CONFIG_SERVICE, value: config },
					{ token: RelationalDbService, module: RelationalDbService },
				],
			});
			return {
				app,
				InvoiceRepositoryImplementation: InvoiceRelationalRepository,
			};
		},
	},
])('$name (E2E)', ({ setup, name }) => {
	beforeEach(async () => {
		if (name === 'InvoiceDynamodbRepository') {
			await ensureDynamoTableExists();
			await clearDynamoTable({
				tableName: DYNAMODB_TABLE_NAME,
				port: DYNAMODB_PORT,
			});
		}
	});

	it('should create, get, and delete an invoice', async () => {
		const { app, InvoiceRepositoryImplementation } = await setup();
		const repo = app.create<InvoiceRepository>(InvoiceRepositoryImplementation);

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
		const { app, InvoiceRepositoryImplementation } = await setup();
		const repo = app.create<InvoiceRepository>(InvoiceRepositoryImplementation);
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
			if (name === 'InvoiceDynamodbRepository') {
				await repo.createWithId(inv.id, inv.type, inv.customer, 'test-user');
			}
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

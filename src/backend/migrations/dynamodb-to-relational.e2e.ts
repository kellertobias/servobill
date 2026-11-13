/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import '@/backend/repositories';
import type { CustomerEntity } from '@/backend/entities/customer.entity';
import { InvoiceType } from '@/backend/entities/invoice.entity';
import { InvoiceItemEntity } from '@/backend/entities/invoice-item.entity';
import { SettingsEntity } from '@/backend/entities/settings.entity';
import {
	AttachmentDynamoDBRepository,
	AttachmentRelationalRepository,
} from '@/backend/repositories/attachment';
import {
	CustomerDynamodbRepository,
	CustomerRelationalRepository,
} from '@/backend/repositories/customer';
import { ExpenseDynamodbRepository } from '@/backend/repositories/expense';
import {
	InvoiceDynamodbRepository,
	InvoiceRelationalRepository,
} from '@/backend/repositories/invoice';
import {
	SettingsDynamodbRepository,
	SettingsRelationalRepository,
} from '@/backend/repositories/settings';
import {
	CONFIG_SERVICE,
	DYNAMODB_SERVICE,
	EVENTBUS_SERVICE,
	RELATIONALDB_SERVICE,
} from '@/backend/services/di-tokens';
import { DynamoDBService } from '@/backend/services/dynamodb.service';
import { RelationalDbService } from '@/backend/services/relationaldb.service';
import { App } from '@/common/di';
import {
	getConfigForDynamodb,
	getConfigForRelationalDb,
} from '@/test/create-config';
import { ensureDynamoTableExists } from '@/test/ensure-dynamo-table';
import { migrateDynamodbToRelational } from './dynamodb-to-relational';

// Needs DynamoDB local and Postgres at the same time
const needsBoth =
	!!process.env.VITEST_REPOTYPE && process.env.VITEST_REPOTYPE !== 'all';

describe.skipIf(needsBoth)('migrateDynamodbToRelational', () => {
	const eventBus = { send: vi.fn().mockResolvedValue('id') };
	let source: ReturnType<typeof App.forRoot>;
	let target: ReturnType<typeof App.forRoot>;
	const ids: Record<string, string> = {};

	beforeAll(async () => {
		const tableName = `migration-${randomUUID()}`;
		await ensureDynamoTableExists(tableName);
		source = App.forRoot({
			modules: [
				{ token: CONFIG_SERVICE, value: getConfigForDynamodb(tableName) },
				{ token: DYNAMODB_SERVICE, module: DynamoDBService },
				{ token: EVENTBUS_SERVICE, value: eventBus },
			],
		});
		target = App.forRoot({
			modules: [
				{ token: CONFIG_SERVICE, value: getConfigForRelationalDb() },
				{ token: RELATIONALDB_SERVICE, module: RelationalDbService },
				{ token: EVENTBUS_SERVICE, value: eventBus },
			],
		});
		const db = target.get<RelationalDbService>(RELATIONALDB_SERVICE);
		await db.initialize();
		await db.dataSource.synchronize(true);

		// Seed the DynamoDB side through the app's own repositories
		const customers = source.create<CustomerDynamodbRepository>(
			CustomerDynamodbRepository,
		);
		const customer = await customers.create();
		customer.update({
			name: 'ACME GmbH',
			email: 'billing@acme.example',
			showContact: false,
			countryCode: 'DE',
		} as any);
		await customers.save(customer);
		ids.customer = customer.id;

		const invoices = source.create<InvoiceDynamodbRepository>(
			InvoiceDynamodbRepository,
		);
		const invoice = await invoices.create(
			InvoiceType.INVOICE,
			customer as CustomerEntity,
			'test-user',
		);
		invoice.updateItems([
			new InvoiceItemEntity({
				name: 'Consulting',
				quantity: 2,
				priceCents: 10000,
				taxPercentage: 19,
			} as any),
		]);
		await invoices.save(invoice);
		ids.invoice = invoice.id;

		const expenses = source.create<ExpenseDynamodbRepository>(
			ExpenseDynamodbRepository,
		);
		const expense = await expenses.create();
		ids.expense = expense.id;

		const attachments = source.create<AttachmentDynamoDBRepository>(
			AttachmentDynamoDBRepository,
		);
		const attachment = await attachments.create({
			fileName: 'receipt.pdf',
			mimeType: 'application/pdf',
			size: 1234,
			s3Key: `${randomUUID()}/receipt.pdf`,
			s3Bucket: 'servobill-prod-bucket',
			expenseIds: [expense.id],
		});
		ids.attachment = attachment.id;

		// Older installations stored a single expense id instead of a list
		ids.legacyAttachment = randomUUID();
		await (attachments as any).store
			.create({
				attachmentId: ids.legacyAttachment,
				storeId: 'attachment',
				fileName: 'old.pdf',
				mimeType: 'application/pdf',
				size: 1,
				s3Key: 'old/old.pdf',
				s3Bucket: '',
				status: 'finished',
				linkType: 'expense',
				linkedId: expense.id,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			})
			.go();

		const settings = source.create<SettingsDynamodbRepository>(
			SettingsDynamodbRepository,
		);
		await settings.save(
			new SettingsEntity({
				settingId: 'company-data',
				data: JSON.stringify({ companyData: { name: 'Migrated Ltd' } }),
			}),
		);
	});

	it('copies the entities with their content', async () => {
		const result = await migrateDynamodbToRelational({
			source,
			target,
			filesBucket: 'servobill-prod-bucket',
		});
		const byName = Object.fromEntries(result.map((r) => [r.entity, r]));
		expect(byName.customer).toMatchObject({ read: 1, written: 1, inTarget: 1 });
		expect(byName.invoice).toMatchObject({ read: 1, inTarget: 1 });
		expect(byName.attachment).toMatchObject({ read: 2, inTarget: 2 });
		expect(byName.settings).toMatchObject({ read: 1, inTarget: 1 });

		const customer = await target
			.create<CustomerRelationalRepository>(CustomerRelationalRepository)
			.getById(ids.customer);
		expect(customer?.name).toBe('ACME GmbH');

		const invoice = await target
			.create<InvoiceRelationalRepository>(InvoiceRelationalRepository)
			.getById(ids.invoice);
		expect(invoice?.customer.name).toBe('ACME GmbH');
		expect(invoice?.items).toHaveLength(1);
		expect(invoice?.items[0]).toMatchObject({
			name: 'Consulting',
			quantity: 2,
		});

		const attachment = await target
			.create<AttachmentRelationalRepository>(AttachmentRelationalRepository)
			.getById(ids.attachment);
		expect(attachment).toMatchObject({
			s3Bucket: 'servobill-prod-bucket',
			fileName: 'receipt.pdf',
		});
		expect(attachment?.expenseIds).toEqual([ids.expense]);
		const legacy = await target
			.create<AttachmentRelationalRepository>(AttachmentRelationalRepository)
			.getById(ids.legacyAttachment);
		expect(legacy?.expenseIds).toEqual([ids.expense]);
		// stored without a bucket: gets the bucket of the installation
		expect(legacy?.s3Bucket).toBe('servobill-prod-bucket');

		const settingsRepo = target.create<SettingsRelationalRepository>(
			SettingsRelationalRepository,
		) as any;
		await settingsRepo.initialized.promise;
		const setting = await settingsRepo.repository.findOneBy({
			settingId: 'company-data',
		});
		expect(JSON.parse(setting?.data ?? '{}')).toEqual({
			companyData: { name: 'Migrated Ltd' },
		});
	});

	it('can run again without duplicates and sends no events', async () => {
		eventBus.send.mockClear();
		const result = await migrateDynamodbToRelational({ source, target });
		expect(result.find((r) => r.entity === 'invoice')?.inTarget).toBe(1);
		expect(result.find((r) => r.entity === 'customer')?.inTarget).toBe(1);
		expect(eventBus.send).not.toHaveBeenCalled();
	});

	it('writes nothing in a dry run and empties the target with reset', async () => {
		const dry = await migrateDynamodbToRelational({
			source,
			target,
			dryRun: true,
			reset: true,
		});
		expect(dry.find((r) => r.entity === 'invoice')).toMatchObject({
			read: 1,
			inTarget: 0,
		});
		const invoices = target.create<InvoiceRelationalRepository>(
			InvoiceRelationalRepository,
		);
		// dry run did not reset
		expect(await invoices.getById(ids.invoice)).not.toBeNull();

		// A customer that only exists in the target is removed by reset
		await target
			.create<CustomerRelationalRepository>(CustomerRelationalRepository)
			.create();
		const reset = await migrateDynamodbToRelational({
			source,
			target,
			reset: true,
		});
		expect(reset.find((r) => r.entity === 'customer')?.inTarget).toBe(1);
	});
});

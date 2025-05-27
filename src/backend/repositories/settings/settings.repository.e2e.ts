// @vitest-environment node
// @vitest-execute serial

import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import {
	SettingsEntity,
	PdfTemplateSetting,
} from '@/backend/entities/settings.entity';
import { DatabaseType } from '@/backend/services/constants';
import { SettingsDynamodbRepository } from './settings.dynamodb-repository';
import { SettingsRelationalRepository } from './settings.relational-repository';
import { DynamoDBService } from '@/backend/services/dynamodb.service';
import { RelationalDbService } from '@/backend/services/relationaldb.service';
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
import { SettingsRepository } from './interface';
import {
	DynamoDBClient,
	ScanCommand,
	DeleteItemCommand,
} from '@aws-sdk/client-dynamodb';
import { SettingsOrmEntity } from './relational-orm-entity';

/**
 * Helper to clear all items from the DynamoDB test table.
 */
async function clearDynamoTable() {
	const client = new DynamoDBClient({
		region: 'eu-central-1',
		endpoint: `http://localhost:${DYNAMODB_PORT}`,
		credentials: {
			accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
			secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
		},
	});
	const scan = await client.send(
		new ScanCommand({ TableName: DYNAMODB_TABLE_NAME }),
	);
	if (scan.Items) {
		for (const item of scan.Items) {
			await client.send(
				new DeleteItemCommand({
					TableName: DYNAMODB_TABLE_NAME,
					Key: {
						pk: item.pk,
						sk: item.sk,
					},
				}),
			);
		}
	}
}

describe.each([
	{
		dbType: DatabaseType.DYNAMODB,
		name: 'SettingsDynamodbRepository',
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
				SettingsRepositoryImplementation: SettingsDynamodbRepository,
			};
		},
	},
	{
		dbType: DatabaseType.POSTGRES,
		name: 'SettingsRelationalRepository',
		setup: async () => {
			const { OrmEntityRegistry } = await import(
				'@/common/orm-entity-registry'
			);
			OrmEntityRegistry.push(SettingsOrmEntity);
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
				SettingsRepositoryImplementation: SettingsRelationalRepository,
			};
		},
	},
])('$name (E2E)', ({ setup, name }) => {
	beforeEach(async () => {
		if (name === 'SettingsDynamodbRepository') {
			await ensureDynamoTableExists();
			await clearDynamoTable();
		}
	});

	it('should create, get, and update a settings record using the class-based API', async () => {
		const { app, SettingsRepositoryImplementation } = await setup();
		const repo = app.create<SettingsRepository>(
			SettingsRepositoryImplementation,
		);

		// Create and save a PdfTemplateSetting
		const initial = new PdfTemplateSetting(
			{
				pdfTemplate: 'foo',
				emailSubjectInvoices: 'bar',
			},
			async () => {},
		);
		await repo.save(
			new SettingsEntity({
				settingId: PdfTemplateSetting.settingId,
				data: JSON.stringify(initial.serializable()),
			}),
		);

		// Get using the class-based API
		const found = await repo.getSetting(PdfTemplateSetting);
		expect(found).toBeInstanceOf(PdfTemplateSetting);
		expect(found.pdfTemplate).toBe('foo');
		expect(found.emailSubjectInvoices).toBe('bar');

		// Update and save
		found.pdfTemplate = 'baz';
		await found.save();
		const updated = await repo.getSetting(PdfTemplateSetting);
		expect(updated.pdfTemplate).toBe('baz');
	});
});

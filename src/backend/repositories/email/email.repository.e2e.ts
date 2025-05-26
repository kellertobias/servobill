// @vitest-environment node
// @vitest-execute serial

import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import { EmailEntity } from '@/backend/entities/email.entity';
import { DatabaseType } from '@/backend/services/constants';
import { EmailDynamodbRepository } from './email.dynamodb-repository';
import { EmailRelationalRepository } from './email.relational-repository';
import { DynamoDBService } from '@/backend/services/dynamodb.service';
import { RelationalDbService } from '@/backend/services/relationaldb.service';
import { EmailOrmEntity } from './relational-orm-entity';
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
import { EmailRepository } from './interface';
import { clearDynamoTable } from '@/test/clear-dynamo-table';

/**
 * Parameterized test suite for both repository implementations.
 */
describe.each([
	{
		dbType: DatabaseType.DYNAMODB,
		name: 'EmailDynamodbRepository',
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
				EmailRepositoryImplementation: EmailDynamodbRepository,
			};
		},
	},
	{
		dbType: DatabaseType.POSTGRES,
		name: 'EmailRelationalRepository',
		setup: async () => {
			const { OrmEntityRegistry } = await import(
				'@/common/orm-entity-registry'
			);
			OrmEntityRegistry.push(EmailOrmEntity);
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
				EmailRepositoryImplementation: EmailRelationalRepository,
			};
		},
	},
])('$name (E2E)', ({ setup, name }) => {
	beforeEach(async () => {
		if (name === 'EmailDynamodbRepository') {
			await ensureDynamoTableExists();
			await clearDynamoTable({
				tableName: DYNAMODB_TABLE_NAME,
				port: DYNAMODB_PORT,
			});
		}
	});

	it('should create, get, and delete an email', async () => {
		const { app, EmailRepositoryImplementation } = await setup();
		const repo = app.create<EmailRepository>(EmailRepositoryImplementation);

		const email = new EmailEntity({
			id: 'e1',
			entityType: 'invoice',
			entityId: 'inv1',
			recipient: 'test@example.com',
			sentAt: new Date(),
		});
		if (name === 'EmailDynamodbRepository') {
			await repo.createWithId(email.id);
		}
		await repo.save(email);
		const found = await repo.getById('e1');
		expect(found).toBeDefined();
		expect(found?.recipient).toBe('test@example.com');
		await repo.delete('e1');
		const afterDelete = await repo.getById('e1');
		expect(afterDelete).toBeNull();
	});

	it('should list emails using listByQuery', async () => {
		const { app, EmailRepositoryImplementation } = await setup();
		const repo = app.create<EmailRepository>(EmailRepositoryImplementation);
		const emails = [
			new EmailEntity({
				id: 'e2',
				entityType: 'invoice',
				entityId: 'inv2',
				recipient: 'alice@example.com',
				sentAt: new Date(),
			}),
			new EmailEntity({
				id: 'e3',
				entityType: 'invoice',
				entityId: 'inv3',
				recipient: 'bob@example.com',
				sentAt: new Date(),
			}),
			new EmailEntity({
				id: 'e4',
				entityType: 'invoice',
				entityId: 'inv4',
				recipient: 'charlie@example.com',
				sentAt: new Date(),
			}),
		];
		for (const e of emails) {
			if (name === 'EmailDynamodbRepository') {
				await repo.createWithId(e.id);
			}
			await repo.save(e);
		}
		const all = await repo.listByQuery({});
		const allIds = all.map((e: EmailEntity) => e.id);
		expect(allIds).toEqual(expect.arrayContaining(['e2', 'e3', 'e4']));
		const searchAlice = await repo.listByQuery({ where: { search: 'alice' } });
		expect(searchAlice.length).toBeGreaterThan(0);
		expect(searchAlice[0].recipient.toLowerCase()).toContain('alice');
		const searchNone = await repo.listByQuery({ where: { search: 'xyz' } });
		expect(searchNone.length).toBe(0);
		for (const e of emails) {
			await repo.delete(e.id);
		}
	});
});

// @vitest-environment node
// @vitest-execute serial

import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import { SessionEntity } from '@/backend/entities/session.entity';
import { UserEntity } from '@/backend/entities/user.entity';
import { DatabaseType } from '@/backend/services/constants';
import { SessionDynamodbRepository } from './session.dynamodb-repository';
import { SessionRelationalRepository } from './session.relational-repository';
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
import { SessionRepository } from './interface';
import {
	DynamoDBClient,
	ScanCommand,
	DeleteItemCommand,
} from '@aws-sdk/client-dynamodb';
import { SessionOrmEntity } from './relational-orm-entity';

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
		name: 'SessionDynamodbRepository',
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
				SessionRepositoryImplementation: SessionDynamodbRepository,
			};
		},
	},
	{
		dbType: DatabaseType.POSTGRES,
		name: 'SessionRelationalRepository',
		setup: async () => {
			const { OrmEntityRegistry } = await import(
				'@/common/orm-entity-registry'
			);
			OrmEntityRegistry.push(SessionOrmEntity);
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
				SessionRepositoryImplementation: SessionRelationalRepository,
			};
		},
	},
])('$name (E2E)', ({ setup, name }) => {
	beforeEach(async () => {
		if (name === 'SessionDynamodbRepository') {
			await ensureDynamoTableExists();
			await clearDynamoTable();
		}
	});

	it('should create, get, update, and delete a session', async () => {
		const { app, SessionRepositoryImplementation } = await setup();
		const repo = app.create<SessionRepository>(SessionRepositoryImplementation);

		const session = new SessionEntity({
			sessionId: 's1',
			userId: 'u1',
			renewalId: 'r1',
			expiresAt: new Date(),
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		// Create
		const created = await repo.createSession({
			userId: session.userId,
			renewalId: session.renewalId,
			expiresAt: session.expiresAt,
			// DomainEntity required props (dummies for test)
			id: '',
			events: [],
			purgeEvents: async () => {},
		} as any);
		expect(created).toBeDefined();
		expect(created.userId).toBe(session.userId);
		// Get
		const found = await repo.getSession(created.sessionId);
		expect(found).toBeDefined();
		expect(found?.userId).toBe(session.userId);
		// Update
		await repo.updateSession(created.sessionId, { renewalId: 'r2' });
		const updated = await repo.getSession(created.sessionId);
		expect(updated?.renewalId).toBe('r2');
		// Delete
		await repo.deleteSession(created.sessionId);
		const afterDelete = await repo.getSession(created.sessionId);
		expect(afterDelete).toBeNull();
	});

	it('should return undefined for disallowed user in findUserForSession', async () => {
		const { app, SessionRepositoryImplementation } = await setup();
		const repo = app.create<SessionRepository>(SessionRepositoryImplementation);
		const user = await repo.findUserForSession({
			userId: 'u1',
			name: 'Test User',
			email: 'notallowed@example.com',
		});
		expect(user).toBeUndefined();
	});

	it('should return a UserEntity for allowed user in findUserForSession', async () => {
		const { app, SessionRepositoryImplementation } = await setup();
		const repo = app.create<SessionRepository>(SessionRepositoryImplementation);
		process.env.ALLOWED_EMAILS = 'allowed@example.com';
		const user = await repo.findUserForSession({
			userId: 'u1',
			name: 'Test User',
			email: 'allowed@example.com',
			profilePictureUrl: 'http://example.com/pic.png',
		});
		expect(user).toBeInstanceOf(UserEntity);
		expect(user?.email).toBe('allowed@example.com');
	});
});

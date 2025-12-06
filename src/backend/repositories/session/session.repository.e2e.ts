// @vitest-environment node
// @vitest-execute serial

import 'reflect-metadata';
import { beforeEach, describe, expect, it } from 'vitest';
import { SessionEntity } from '@/backend/entities/session.entity';
import { UserEntity } from '@/backend/entities/user.entity';
import { prepareRepoTest } from '@/test/repo-test';
import type { SessionRepository } from './interface';
import { SessionOrmEntity } from './relational-orm-entity';
import { SessionDynamodbRepository } from './session.dynamodb-repository';
import { SessionRelationalRepository } from './session.relational-repository';

const repoTestCases = prepareRepoTest<SessionRepository>({
	name: 'Session',
	relational: SessionRelationalRepository,
	dynamodb: SessionDynamodbRepository,
	relationalOrmEntity: SessionOrmEntity,
});

describe.each(repoTestCases)('$name (E2E)', ({ setup, onBeforeEach }) => {
	beforeEach(async () => {
		await onBeforeEach();
	});

	it('should create, get, update, and delete a session', async () => {
		const { app, RepositoryImplementation } = await setup();
		const repo = app.create<SessionRepository>(RepositoryImplementation);

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
		} as unknown as SessionEntity);
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
		const { app, RepositoryImplementation } = await setup();
		const repo = app.create<SessionRepository>(RepositoryImplementation);
		const user = await repo.findUserForSession({
			userId: 'u1',
			name: 'Test User',
			email: 'notallowed@example.com',
		});
		expect(user).toBeUndefined();
	});

	it('should return a UserEntity for allowed user in findUserForSession', async () => {
		const { app, RepositoryImplementation } = await setup();
		const repo = app.create<SessionRepository>(RepositoryImplementation);
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

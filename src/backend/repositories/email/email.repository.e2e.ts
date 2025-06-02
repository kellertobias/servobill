// @vitest-environment node
// @vitest-execute serial

import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';

import { EmailDynamodbRepository } from './email.dynamodb-repository';
import { EmailRelationalRepository } from './email.relational-repository';
import { EmailOrmEntity } from './relational-orm-entity';
import { EmailRepository } from './interface';

import { EmailEntity } from '@/backend/entities/email.entity';
import { prepareRepoTest } from '@/test/repo-test';

/**
 * Parameterized test suite for both repository implementations.
 */
const repoTestCases = prepareRepoTest({
	name: 'Email',
	relational: EmailRelationalRepository,
	dynamodb: EmailDynamodbRepository,
	relationalOrmEntity: EmailOrmEntity,
});

describe.each(repoTestCases)('$name (E2E)', ({ setup, onBeforeEach }) => {
	beforeEach(async () => {
		await onBeforeEach();
	});

	it('should create, get, and delete an email', async () => {
		const { app, RepositoryImplementation } = await setup();
		const repo = app.create<EmailRepository>(RepositoryImplementation);

		const email = new EmailEntity({
			id: 'e1',
			entityType: 'invoice',
			entityId: 'inv1',
			recipient: 'test@example.com',
			sentAt: new Date(),
		});
		await repo.createWithId(email.id);
		await repo.save(email);
		const found = await repo.getById('e1');
		expect(found).toBeDefined();
		expect(found?.recipient).toBe('test@example.com');
		await repo.delete('e1');
		const afterDelete = await repo.getById('e1');
		expect(afterDelete).toBeNull();
	});

	it('should list emails using listByQuery', async () => {
		const { app, RepositoryImplementation } = await setup();
		const repo = app.create<EmailRepository>(RepositoryImplementation);
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
			await repo.createWithId(e.id);
			await repo.save(e);
		}
		const all = await repo.listByQuery({});
		const allIds = all.map((e) => e.id);
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

// @vitest-environment node
// @vitest-execute serial

import 'reflect-metadata';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuditLogEntity } from '@/backend/entities/audit-log.entity';
import { prepareRepoTest } from '@/test/repo-test';
import { AuditLogDynamodbRepository } from './audit-log.dynamodb-repository';
import { AuditLogRelationalRepository } from './audit-log.relational-repository';
import type { AuditLogRepository } from './interface';
import { AuditLogOrmEntity } from './relational-orm-entity';

const repoTestCases = prepareRepoTest<AuditLogRepository>({
	name: 'AuditLog',
	relational: AuditLogRelationalRepository,
	dynamodb: AuditLogDynamodbRepository,
	relationalOrmEntity: AuditLogOrmEntity,
});

describe.each(repoTestCases)('$name (E2E)', ({ setup, onBeforeEach }) => {
	beforeEach(async () => {
		await onBeforeEach();
	});

	it('records entries and lists them newest first with paging and filters', async () => {
		const { app, RepositoryImplementation } = await setup();
		const repo = app.create<AuditLogRepository>(RepositoryImplementation);

		const start = Date.UTC(2026, 0, 1);
		for (let i = 0; i < 5; i++) {
			await repo.record(
				new AuditLogEntity({
					createdAt: new Date(start + i * 1000),
					action: `action-${i}`,
					actor: { userId: i % 2 ? 'odd' : 'even', email: 'a@example.com' },
					entityType: i < 2 ? 'Invoice' : 'Customer',
					entityId: `id-${i}`,
					success: i !== 3,
					details: { args: { index: i } },
					ipAddress: '127.0.0.1',
				}),
			);
		}

		const first = await repo.list({ limit: 2 });
		expect(first.entries.map((e) => e.action)).toEqual([
			'action-4',
			'action-3',
		]);
		expect(first.entries[1].success).toBe(false);
		expect(first.entries[0].details).toEqual({ args: { index: 4 } });
		expect(first.entries[0].actor).toEqual({
			userId: 'even',
			email: 'a@example.com',
		});
		expect(first.nextCursor).toBeTruthy();

		const second = await repo.list({ limit: 2, cursor: first.nextCursor });
		expect(second.entries.map((e) => e.action)).toEqual([
			'action-2',
			'action-1',
		]);

		const third = await repo.list({ limit: 2, cursor: second.nextCursor });
		expect(third.entries.map((e) => e.action)).toEqual(['action-0']);
		expect(third.nextCursor).toBeFalsy();

		const odd = await repo.list({ limit: 10, actorId: 'odd' });
		expect(odd.entries.map((e) => e.action)).toEqual(['action-3', 'action-1']);

		const invoices = await repo.list({ limit: 10, entityType: 'Invoice' });
		expect(invoices.entries.map((e) => e.action)).toEqual([
			'action-1',
			'action-0',
		]);
	});
});

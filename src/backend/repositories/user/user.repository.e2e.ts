// @vitest-environment node
// @vitest-execute serial

import 'reflect-metadata';
import { beforeEach, describe, expect, it } from 'vitest';
import { UserRole } from '@/backend/entities/user.entity';
import { prepareRepoTest } from '@/test/repo-test';
import type { UserRepository } from './interface';
import { UserOrmEntity } from './relational-orm-entity';
import { UserDynamodbRepository } from './user.dynamodb-repository';
import { UserRelationalRepository } from './user.relational-repository';

const repoTestCases = prepareRepoTest<UserRepository>({
	name: 'User',
	relational: UserRelationalRepository,
	dynamodb: UserDynamodbRepository,
	relationalOrmEntity: UserOrmEntity,
});

describe.each(repoTestCases)('$name (E2E)', ({ setup, onBeforeEach }) => {
	beforeEach(async () => {
		await onBeforeEach();
	});

	it('creates, finds, updates and deletes users', async () => {
		const { app, RepositoryImplementation } = await setup();
		const repo = app.create<UserRepository>(RepositoryImplementation);

		const user = await repo.create();
		user.update({
			email: 'Admin@Example.com',
			name: 'Admin',
			role: UserRole.ADMIN,
		});
		user.setPasswordHash('scrypt$hash');
		user.linkIdentity('zitadel', 'sub-1');
		await repo.save(user);

		const other = await repo.create();
		other.update({ email: 'user@example.com', name: 'User' });
		await repo.save(other);

		const byId = await repo.getById(user.id);
		expect(byId?.email).toBe('admin@example.com');
		expect(byId?.role).toBe(UserRole.ADMIN);
		expect(byId?.passwordHash).toBe('scrypt$hash');
		expect(byId?.disabled).toBe(false);

		expect((await repo.findByEmail('ADMIN@example.com'))?.id).toBe(user.id);
		expect(await repo.findByEmail('nobody@example.com')).toBeNull();
		expect((await repo.findByIdentity('zitadel', 'sub-1'))?.id).toBe(user.id);
		expect(await repo.findByIdentity('zitadel', 'sub-2')).toBeNull();

		const all = await repo.listAll();
		expect(all.map((u) => u.email)).toEqual([
			'admin@example.com',
			'user@example.com',
		]);

		other.update({ disabled: true });
		other.setPasswordHash(undefined);
		await repo.save(other);
		const updated = await repo.getById(other.id);
		expect(updated?.disabled).toBe(true);
		expect(updated?.hasPassword).toBe(false);

		await repo.delete(other.id);
		expect(await repo.getById(other.id)).toBeNull();
	});
});

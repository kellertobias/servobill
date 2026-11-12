import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { type AuthConfig, getAuthConfig } from '@/backend/api/auth/config';
import { UserEntity, UserRole } from '@/backend/entities/user.entity';
import type { UserRepository } from '@/backend/repositories/user/interface';
import {
	AccountLockedError,
	MAX_FAILED_LOGINS,
	UserDirectoryService,
} from './user-directory.service';

/** In-memory repository; clones on read/write like a real database. */
class MemoryUserRepository implements UserRepository {
	public rows = new Map<string, UserEntity>();
	private clone(user: UserEntity) {
		return new UserEntity({
			...user,
			identities: user.identities.map((i) => ({ ...i })),
		});
	}
	async getById(id: string) {
		const user = this.rows.get(id);
		return user ? this.clone(user) : null;
	}
	async create() {
		const id = randomUUID();
		const user = new UserEntity({ id, name: '', email: `${id}@users.invalid` });
		this.rows.set(id, this.clone(user));
		return user;
	}
	async createWithId(id: string) {
		const user = new UserEntity({ id, name: '', email: `${id}@users.invalid` });
		this.rows.set(id, this.clone(user));
		return user;
	}
	async save(user: UserEntity) {
		this.rows.set(user.id, this.clone(user));
	}
	async delete(id: string) {
		this.rows.delete(id);
	}
	async listAll() {
		return [...this.rows.values()].map((user) => this.clone(user));
	}
	async findByEmail(email: string) {
		const user = [...this.rows.values()].find(
			(u) => u.email === email.toLowerCase(),
		);
		return user ? this.clone(user) : null;
	}
	async findByIdentity(provider: string, subject: string) {
		const user = [...this.rows.values()].find((u) =>
			u.hasIdentity(provider, subject),
		);
		return user ? this.clone(user) : null;
	}
}

class TestDirectory extends UserDirectoryService {
	public config: AuthConfig = getAuthConfig({});
	protected getConfig() {
		return this.config;
	}
}

const external = (
	overrides: Partial<
		Parameters<UserDirectoryService['resolveExternalLogin']>[0]
	> = {},
) => ({
	provider: 'zitadel',
	subject: 'sub-1',
	email: 'Person@Example.com',
	emailVerified: true,
	name: 'Person',
	autoProvision: false,
	requireVerifiedEmail: true,
	...overrides,
});

describe('UserDirectoryService', () => {
	let repo: MemoryUserRepository;
	let directory: TestDirectory;

	beforeEach(() => {
		repo = new MemoryUserRepository();
		directory = new TestDirectory(repo);
	});

	describe('external login', () => {
		it('rejects unknown users without allow list or auto provisioning', async () => {
			expect(await directory.resolveExternalLogin(external())).toBeNull();
			expect(repo.rows.size).toBe(0);
		});

		it('provisions allow-listed users and makes the first one admin', async () => {
			directory.config = getAuthConfig({
				ALLOWED_EMAILS: 'person@example.com,other@example.com',
			});
			const first = await directory.resolveExternalLogin(external());
			expect(first?.role).toBe(UserRole.ADMIN);
			expect(first?.email).toBe('person@example.com');

			const second = await directory.resolveExternalLogin(
				external({ subject: 'sub-2', email: 'other@example.com' }),
			);
			expect(second?.role).toBe(UserRole.USER);
		});

		it('auto provisions regular users when the provider allows it', async () => {
			await directory.createUser({
				email: 'admin@example.com',
				name: 'Admin',
				role: UserRole.ADMIN,
			});
			const user = await directory.resolveExternalLogin(
				external({ autoProvision: true }),
			);
			expect(user?.role).toBe(UserRole.USER);
			expect(user?.identities).toEqual([
				{ provider: 'zitadel', subject: 'sub-1' },
			]);
		});

		it('links an existing user by verified email and finds them by identity later', async () => {
			const created = await directory.createUser({
				email: 'person@example.com',
				name: 'P',
			});
			const linked = await directory.resolveExternalLogin(external());
			expect(linked?.id).toBe(created.id);
			// Email changed at the provider: identity still matches
			const again = await directory.resolveExternalLogin(
				external({ email: 'new@example.com' }),
			);
			expect(again?.id).toBe(created.id);
		});

		it('does not link or provision with an unverified email', async () => {
			await directory.createUser({ email: 'person@example.com', name: 'P' });
			expect(
				await directory.resolveExternalLogin(
					external({ emailVerified: false }),
				),
			).toBeNull();
			expect(
				await directory.resolveExternalLogin(
					external({ emailVerified: false, requireVerifiedEmail: false }),
				),
			).not.toBeNull();
		});

		it('rejects disabled users', async () => {
			await directory.createUser({
				email: 'admin@example.com',
				name: 'A',
				role: UserRole.ADMIN,
			});
			const user = await directory.createUser({
				email: 'person@example.com',
				name: 'P',
			});
			await directory.updateUser(user.id, { disabled: true }, 'someone-else');
			expect(await directory.resolveExternalLogin(external())).toBeNull();
			expect(await directory.getActiveUser(user.id)).toBeNull();
		});

		it('applies the role from the provider and ADMIN_EMAILS', async () => {
			const user = await directory.createUser({
				email: 'person@example.com',
				name: 'P',
			});
			const promoted = await directory.resolveExternalLogin(
				external({ providerRole: UserRole.ADMIN }),
			);
			expect(promoted?.role).toBe(UserRole.ADMIN);

			directory.config = getAuthConfig({ ADMIN_EMAILS: 'person@example.com' });
			const stillAdmin = await directory.resolveExternalLogin(
				external({ providerRole: UserRole.USER }),
			);
			expect(stillAdmin?.id).toBe(user.id);
			expect(stillAdmin?.role).toBe(UserRole.ADMIN);
		});
	});

	describe('local login', () => {
		beforeEach(() => {
			directory.config = getAuthConfig({
				LOCAL_AUTH_ENABLED: 'true',
				INITIAL_ADMIN_EMAIL: 'root@example.com',
				INITIAL_ADMIN_PASSWORD: 'initial-password',
			});
		});

		it('bootstraps the initial admin only with the configured password', async () => {
			expect(
				await directory.authenticateLocal('root@example.com', 'wrong-password'),
			).toBeNull();
			const admin = await directory.authenticateLocal(
				'Root@Example.com',
				'initial-password',
			);
			expect(admin?.role).toBe(UserRole.ADMIN);
			expect(admin?.hasPassword).toBe(true);
			expect(repo.rows.size).toBe(1);
		});

		it('does not bootstrap once an admin exists', async () => {
			await directory.createUser({
				email: 'other@example.com',
				name: 'O',
				role: UserRole.ADMIN,
			});
			expect(
				await directory.authenticateLocal(
					'root@example.com',
					'initial-password',
				),
			).toBeNull();
		});

		it('checks passwords of local users', async () => {
			await directory.createUser({
				email: 'user@example.com',
				name: 'U',
				password: 'a-good-password',
			});
			expect(
				await directory.authenticateLocal(
					'user@example.com',
					'a-good-password',
				),
			).not.toBeNull();
			expect(
				await directory.authenticateLocal('user@example.com', 'wrong-password'),
			).toBeNull();
			expect(
				await directory.authenticateLocal(
					'nobody@example.com',
					'a-good-password',
				),
			).toBeNull();
		});

		it('locks the password sign in after repeated wrong passwords', async () => {
			const created = await directory.createUser({
				email: 'user@example.com',
				name: 'U',
				password: 'a-good-password',
			});
			for (let i = 0; i < MAX_FAILED_LOGINS; i++) {
				expect(
					await directory.authenticateLocal('user@example.com', 'wrong'),
				).toBeNull();
			}
			// The lockout is stored on the user, not in memory
			expect(repo.rows.get(created.id)?.isLockedOut()).toBe(true);
			await expect(
				directory.authenticateLocal('user@example.com', 'a-good-password'),
			).rejects.toBeInstanceOf(AccountLockedError);

			// An administrator setting a new password lifts the lock
			await directory.setPassword(created.id, 'another-good-password');
			const user = await directory.authenticateLocal(
				'user@example.com',
				'another-good-password',
			);
			expect(user?.failedLoginCount).toBe(0);
		});

		it('resets the failure count after a successful sign in', async () => {
			await directory.createUser({
				email: 'user@example.com',
				name: 'U',
				password: 'a-good-password',
			});
			for (let i = 0; i < MAX_FAILED_LOGINS - 1; i++) {
				await directory.authenticateLocal('user@example.com', 'wrong');
			}
			await directory.authenticateLocal('user@example.com', 'a-good-password');
			expect(
				await directory.authenticateLocal('user@example.com', 'wrong'),
			).toBeNull();
			const user = await directory.authenticateLocal(
				'user@example.com',
				'a-good-password',
			);
			expect(user).not.toBeNull();
		});

		it('is off unless LOCAL_AUTH_ENABLED is set', async () => {
			await directory.createUser({
				email: 'user@example.com',
				name: 'U',
				password: 'a-good-password',
			});
			directory.config = getAuthConfig({});
			expect(
				await directory.authenticateLocal(
					'user@example.com',
					'a-good-password',
				),
			).toBeNull();
			await expect(
				directory.createUser({
					email: 'x@example.com',
					name: 'X',
					password: 'a-good-password',
				}),
			).rejects.toThrow(/disabled/);
		});

		it('changes the own password only with the current one', async () => {
			const user = await directory.createUser({
				email: 'user@example.com',
				name: 'U',
				password: 'a-good-password',
			});
			await expect(
				directory.changeOwnPassword(
					user.id,
					'not-the-password',
					'another-password',
				),
			).rejects.toThrow(/current password/);
			await directory.changeOwnPassword(
				user.id,
				'a-good-password',
				'another-password',
			);
			expect(
				await directory.authenticateLocal(
					'user@example.com',
					'another-password',
				),
			).not.toBeNull();
		});
	});

	describe('administration rules', () => {
		it('rejects duplicate email addresses', async () => {
			await directory.createUser({ email: 'a@example.com', name: 'A' });
			await expect(
				directory.createUser({ email: 'A@example.com', name: 'B' }),
			).rejects.toThrow(/already exists/);
		});

		it('protects the last administrator', async () => {
			const admin = await directory.createUser({
				email: 'a@example.com',
				name: 'A',
				role: UserRole.ADMIN,
			});
			const other = await directory.createUser({
				email: 'b@example.com',
				name: 'B',
			});
			await expect(
				directory.updateUser(admin.id, { role: UserRole.USER }, other.id),
			).rejects.toThrow(/last administrator/);
			await expect(directory.deleteUser(admin.id, other.id)).rejects.toThrow(
				/last administrator/,
			);
			await expect(directory.deleteUser(admin.id, admin.id)).rejects.toThrow(
				/own account/,
			);

			await directory.updateUser(other.id, { role: UserRole.ADMIN }, admin.id);
			await directory.updateUser(admin.id, { role: UserRole.USER }, other.id);
			expect((await directory.getUser(admin.id))?.role).toBe(UserRole.USER);
		});
	});
});

import { type AuthConfig, getAuthConfig } from '@/backend/api/auth/config';
import { UserEntity, UserRole } from '@/backend/entities/user.entity';
import { USER_REPOSITORY } from '@/backend/repositories/user/di-tokens';
import type { UserRepository } from '@/backend/repositories/user/interface';
import { Inject, Service } from '@/common/di';
import { Logger } from './logger.service';
import {
	getDummyPasswordHash,
	hashPassword,
	validatePasswordStrength,
	verifyPassword,
} from './password';

const logger = new Logger('UserDirectory');

export class UserDirectoryError extends Error {}

/** Thrown when password sign in is temporarily locked for an account. */
export class AccountLockedError extends Error {
	constructor(public readonly lockedUntil: Date) {
		super('Too many failed attempts. Try again later.');
	}
}

/** Wrong passwords before an account's password sign in is locked. */
export const MAX_FAILED_LOGINS = 10;
/** How long the password sign in stays locked. */
export const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

export type ExternalLogin = {
	provider: string;
	subject: string;
	email?: string;
	emailVerified: boolean;
	name?: string;
	/** Create a regular user if no user matches (provider setting). */
	autoProvision: boolean;
	/** Reject sign in when the email is not verified. */
	requireVerifiedEmail: boolean;
	/**
	 * Role derived from the provider's roles claim. `undefined` means the
	 * provider does not manage roles and the stored role is kept.
	 */
	providerRole?: UserRole;
};

/**
 * Business rules around users: who may sign in, how external identities are
 * linked, first-admin bootstrapping and protection of the last administrator.
 */
@Service()
export class UserDirectoryService {
	constructor(@Inject(USER_REPOSITORY) private users: UserRepository) {}

	protected getConfig(): AuthConfig {
		return getAuthConfig();
	}

	public listUsers(): Promise<UserEntity[]> {
		return this.users.listAll();
	}

	public getUser(id: string): Promise<UserEntity | null> {
		return this.users.getById(id);
	}

	/** Returns the user for a session renewal, or null if they may no longer sign in. */
	public async getActiveUser(
		userId: string | undefined,
	): Promise<UserEntity | null> {
		if (!userId) {
			return null;
		}
		const user = await this.users.getById(userId);
		if (!user || user.disabled) {
			return null;
		}
		this.applyAdminEmails(user, this.getConfig());
		return user;
	}

	private async hasActiveAdmin(exceptUserId?: string): Promise<boolean> {
		const users = await this.users.listAll();
		return users.some(
			(user) => user.isAdmin && !user.disabled && user.id !== exceptUserId,
		);
	}

	private applyAdminEmails(user: UserEntity, config: AuthConfig): boolean {
		if (config.adminEmails.has(user.email) && !user.isAdmin) {
			user.update({ role: UserRole.ADMIN });
			return true;
		}
		return false;
	}

	public async createUser(props: {
		email: string;
		name: string;
		role?: UserRole;
		password?: string | null;
		identity?: { provider: string; subject: string };
	}): Promise<UserEntity> {
		const email = UserEntity.normalizeEmail(props.email || '');
		if (!/^[^\s@]+@[^\s@]+$/.test(email)) {
			throw new UserDirectoryError('A valid email address is required');
		}
		if (await this.users.findByEmail(email)) {
			throw new UserDirectoryError(
				'A user with this email address already exists',
			);
		}
		let passwordHash: string | undefined;
		if (props.password) {
			if (!this.getConfig().localEnabled) {
				throw new UserDirectoryError(
					'Local sign in is disabled (LOCAL_AUTH_ENABLED)',
				);
			}
			passwordHash = await this.hashOrThrow(props.password);
		}

		const user = await this.users.create();
		user.update({
			email,
			name: props.name?.trim() || email,
			role: props.role || UserRole.USER,
		});
		user.setPasswordHash(passwordHash);
		if (props.identity) {
			user.linkIdentity(props.identity.provider, props.identity.subject);
		}
		await this.users.save(user);
		logger.info('User created', { userId: user.id, role: user.role });
		return user;
	}

	public async updateUser(
		id: string,
		props: {
			email?: string;
			name?: string;
			role?: UserRole;
			disabled?: boolean;
		},
		actingUserId: string,
	): Promise<UserEntity> {
		const user = await this.requireUser(id);
		const losesAdmin =
			user.isAdmin &&
			!user.disabled &&
			((props.role !== undefined && props.role !== UserRole.ADMIN) ||
				props.disabled === true);
		if (losesAdmin && !(await this.hasActiveAdmin(user.id))) {
			throw new UserDirectoryError(
				'The last administrator cannot be demoted or disabled',
			);
		}
		if (id === actingUserId && props.disabled === true) {
			throw new UserDirectoryError('You cannot disable your own account');
		}
		if (props.email !== undefined) {
			const email = UserEntity.normalizeEmail(props.email);
			const existing = await this.users.findByEmail(email);
			if (existing && existing.id !== user.id) {
				throw new UserDirectoryError(
					'A user with this email address already exists',
				);
			}
		}
		user.update(props);
		await this.users.save(user);
		return user;
	}

	public async deleteUser(id: string, actingUserId: string): Promise<void> {
		const user = await this.requireUser(id);
		if (id === actingUserId) {
			throw new UserDirectoryError('You cannot delete your own account');
		}
		if (
			user.isAdmin &&
			!user.disabled &&
			!(await this.hasActiveAdmin(user.id))
		) {
			throw new UserDirectoryError('The last administrator cannot be deleted');
		}
		await this.users.delete(id);
	}

	/** Sets or (with `null`) removes a user's local password. */
	public async setPassword(
		id: string,
		password: string | null,
	): Promise<UserEntity> {
		const user = await this.requireUser(id);
		if (password && !this.getConfig().localEnabled) {
			throw new UserDirectoryError(
				'Local sign in is disabled (LOCAL_AUTH_ENABLED)',
			);
		}
		user.setPasswordHash(
			password ? await this.hashOrThrow(password) : undefined,
		);
		await this.users.save(user);
		return user;
	}

	public async changeOwnPassword(
		userId: string,
		currentPassword: string,
		newPassword: string,
	): Promise<void> {
		const user = await this.requireUser(userId);
		if (!this.getConfig().localEnabled) {
			throw new UserDirectoryError(
				'Local sign in is disabled (LOCAL_AUTH_ENABLED)',
			);
		}
		if (
			user.hasPassword &&
			!(await verifyPassword(currentPassword, user.passwordHash))
		) {
			throw new UserDirectoryError('The current password is wrong');
		}
		user.setPasswordHash(await this.hashOrThrow(newPassword));
		await this.users.save(user);
	}

	/**
	 * Checks email and password. Creates the initial administrator from
	 * INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD while no administrator exists.
	 */
	public async authenticateLocal(
		email: string,
		password: string,
	): Promise<UserEntity | null> {
		const config = this.getConfig();
		if (!config.localEnabled || !email || !password) {
			return null;
		}
		const normalizedEmail = UserEntity.normalizeEmail(email);
		let user = await this.users.findByEmail(normalizedEmail);

		if (
			!user &&
			config.initialAdmin &&
			config.initialAdmin.email === normalizedEmail &&
			password === config.initialAdmin.password &&
			!(await this.hasActiveAdmin())
		) {
			logger.info('Creating initial administrator from INITIAL_ADMIN_EMAIL');
			user = await this.users.create();
			user.update({
				email: normalizedEmail,
				name: config.initialAdmin.name,
				role: UserRole.ADMIN,
			});
			user.setPasswordHash(await hashPassword(password));
		} else if (!user?.passwordHash) {
			// Keep the response time similar for unknown users.
			await verifyPassword(password, await getDummyPasswordHash());
			return null;
		} else if (user.isLockedOut()) {
			// Do not test the password while locked, but take the same time.
			await verifyPassword(password, await getDummyPasswordHash());
			throw new AccountLockedError(user.lockedUntil as Date);
		} else if (!(await verifyPassword(password, user.passwordHash))) {
			// Stored on the user, so the limit holds across Lambda instances
			// and containers.
			user.recordFailedLogin(MAX_FAILED_LOGINS, LOGIN_LOCKOUT_MS);
			await this.users.save(user);
			return null;
		}

		if (user.disabled) {
			return null;
		}
		this.applyAdminEmails(user, config);
		user.recordLogin();
		await this.users.save(user);
		return user;
	}

	/**
	 * Maps a successful sign in at an external provider to a local user.
	 *
	 * 1. A user already linked to (provider, subject) signs in.
	 * 2. Otherwise a user with the same verified email is linked and signs in.
	 * 3. Otherwise a user is created if the email is in ALLOWED_EMAILS or
	 *    ADMIN_EMAILS, or the provider has auto provisioning enabled. The first
	 *    user created from the allow lists becomes administrator when no
	 *    administrator exists yet, so existing single-user installs keep working.
	 */
	public async resolveExternalLogin(
		login: ExternalLogin,
	): Promise<UserEntity | null> {
		const config = this.getConfig();
		const email = login.email
			? UserEntity.normalizeEmail(login.email)
			: undefined;
		const emailTrusted =
			!!email && (login.emailVerified || !login.requireVerifiedEmail);

		let user = await this.users.findByIdentity(login.provider, login.subject);

		if (!user && login.requireVerifiedEmail && !login.emailVerified) {
			logger.info('Rejecting external login without verified email', {
				provider: login.provider,
			});
			return null;
		}

		if (!user && emailTrusted && email) {
			user = await this.users.findByEmail(email);
			if (user) {
				user.linkIdentity(login.provider, login.subject);
			}
		}

		if (!user && emailTrusted && email) {
			const onAllowList =
				config.allowedEmails.has(email) || config.adminEmails.has(email);
			if (!onAllowList && !login.autoProvision) {
				logger.info('Rejecting external login of unknown user', {
					provider: login.provider,
				});
				return null;
			}
			const role =
				config.adminEmails.has(email) ||
				login.providerRole === UserRole.ADMIN ||
				(onAllowList && !(await this.hasActiveAdmin()))
					? UserRole.ADMIN
					: UserRole.USER;
			user = await this.users.create();
			user.update({ email, name: login.name?.trim() || email, role });
			user.linkIdentity(login.provider, login.subject);
			logger.info('User provisioned from external login', {
				provider: login.provider,
				userId: user.id,
				role,
			});
		}

		if (!user || user.disabled) {
			return null;
		}

		if (login.providerRole !== undefined && user.role !== login.providerRole) {
			user.update({ role: login.providerRole });
		}
		this.applyAdminEmails(user, config);
		if (!user.name && login.name) {
			user.update({ name: login.name });
		}
		user.recordLogin();
		await this.users.save(user);
		return user;
	}

	public async setProfilePicture(
		user: UserEntity,
		profilePictureUrl: string,
	): Promise<void> {
		user.update({ profilePictureUrl });
		await this.users.save(user);
	}

	private async requireUser(id: string): Promise<UserEntity> {
		const user = await this.users.getById(id);
		if (!user) {
			throw new UserDirectoryError('User not found');
		}
		return user;
	}

	private async hashOrThrow(password: string): Promise<string> {
		try {
			validatePasswordStrength(password);
		} catch (error) {
			throw new UserDirectoryError((error as Error).message);
		}
		return hashPassword(password);
	}
}

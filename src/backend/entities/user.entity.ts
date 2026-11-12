import { DomainEntity } from './abstract.entity';

/**
 * The roles a user can have. Every user is either an administrator or a
 * regular user. Administrators can additionally manage users and settings.
 */
export enum UserRole {
	ADMIN = 'ADMIN',
	USER = 'USER',
}

/**
 * Link between a local user and an account at an external identity provider
 * (Google or any OpenID Connect provider such as Zitadel).
 */
export type UserIdentity = {
	/** Provider id as configured (e.g. `google`, `zitadel`). */
	provider: string;
	/** The `sub` claim the provider issued for this user. */
	subject: string;
};

export type UserProps = {
	id: string;
	name: string;
	email: string;
	role?: UserRole;
	passwordHash?: string;
	identities?: UserIdentity[];
	disabled?: boolean;
	profilePictureUrl?: string;
	lastLoginAt?: Date;
	createdAt?: Date;
	updatedAt?: Date;
};

/**
 * Represents a user of the application. Users either sign in with a local
 * password, with an external identity provider, or both.
 */
export class UserEntity extends DomainEntity {
	/** Unique identifier for the user. */
	public id!: string;
	/** The user's display name. */
	public name!: string;
	/** The user's email address (stored lower-case). */
	public email!: string;
	/** The user's role. */
	public role: UserRole = UserRole.USER;
	/** Hash of the local password, if the user may sign in with a password. */
	public passwordHash?: string;
	/** Linked external identities. */
	public identities: UserIdentity[] = [];
	/** Disabled users cannot sign in and their sessions are not renewed. */
	public disabled = false;
	/** Optional URL to the user's profile picture. */
	public profilePictureUrl?: string;
	public lastLoginAt?: Date;
	public createdAt: Date = new Date();
	public updatedAt: Date = new Date();

	constructor(props: UserProps) {
		super();
		this.id = props.id;
		this.name = props.name;
		this.email = UserEntity.normalizeEmail(props.email || '');
		this.role = props.role || UserRole.USER;
		this.passwordHash = props.passwordHash || undefined;
		this.identities = [...(props.identities || [])];
		this.disabled = !!props.disabled;
		this.profilePictureUrl = props.profilePictureUrl || undefined;
		this.lastLoginAt = props.lastLoginAt;
		this.createdAt = props.createdAt || new Date();
		this.updatedAt = props.updatedAt || new Date();
	}

	/** Backwards compatible alias used by the session layer. */
	public get userId(): string {
		return this.id;
	}

	public get isAdmin(): boolean {
		return this.role === UserRole.ADMIN;
	}

	/** Roles that are put into the session token and checked by `@Authorized`. */
	public get roles(): string[] {
		return this.isAdmin ? [UserRole.USER, UserRole.ADMIN] : [UserRole.USER];
	}

	public get hasPassword(): boolean {
		return !!this.passwordHash;
	}

	public static normalizeEmail(email: string): string {
		return email.trim().toLowerCase();
	}

	public hasIdentity(provider: string, subject: string): boolean {
		return this.identities.some(
			(identity) =>
				identity.provider === provider && identity.subject === subject,
		);
	}

	public linkIdentity(provider: string, subject: string): void {
		if (!this.hasIdentity(provider, subject)) {
			this.identities.push({ provider, subject });
			this.touch();
		}
	}

	public update(
		props: Partial<
			Pick<
				UserEntity,
				'name' | 'email' | 'role' | 'disabled' | 'profilePictureUrl'
			>
		>,
	): void {
		if (props.name !== undefined) {
			this.name = props.name;
		}
		if (props.email !== undefined) {
			this.email = UserEntity.normalizeEmail(props.email);
		}
		if (props.role !== undefined) {
			this.role = props.role;
		}
		if (props.disabled !== undefined) {
			this.disabled = props.disabled;
		}
		if (props.profilePictureUrl !== undefined) {
			this.profilePictureUrl = props.profilePictureUrl;
		}
		this.touch();
	}

	public setPasswordHash(passwordHash: string | undefined): void {
		this.passwordHash = passwordHash;
		this.touch();
	}

	public recordLogin(): void {
		this.lastLoginAt = new Date();
		this.touch();
	}

	private touch(): void {
		this.updatedAt = new Date();
	}
}

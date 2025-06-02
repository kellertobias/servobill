/**
 * Represents a user in the system, typically authenticated via Google OAuth/OpenID.
 */
export class UserEntity {
	/** Unique identifier for the user. */
	public userId!: string;
	/** The user's display name. */
	public name!: string;
	/** The user's email address. */
	public email!: string;
	/** The user's roles (if any). */
	public roles!: string[];
	/** Optional URL to the user's profile picture. */
	public profilePictureUrl?: string;

	constructor(props: Partial<UserEntity>) {
		Object.assign(this, props);
	}
}

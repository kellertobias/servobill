import type { UserEntity } from '@/backend/entities/user.entity';
import type { AbstractRepositoryInterface } from '../abstract-repository';

/**
 * Interface for all User repositories (DynamoDB, Postgres, SQLite).
 */
export type UserRepository = AbstractRepositoryInterface<
	UserEntity,
	[],
	{
		/** Returns all users, sorted by email. */
		listAll(): Promise<UserEntity[]>;

		/** Finds a user by email address (case-insensitive). */
		findByEmail(email: string): Promise<UserEntity | null>;

		/** Finds the user linked to an external identity. */
		findByIdentity(
			provider: string,
			subject: string,
		): Promise<UserEntity | null>;
	}
>;

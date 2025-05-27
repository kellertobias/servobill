import { SessionEntity } from '@/backend/entities/session.entity';
import { UserEntity } from '@/backend/entities/user.entity';
import { AbstractRepositoryInterface } from '../abstract-repository';

/**
 * Interface for all Session repositories (DynamoDB, Postgres, SQLite).
 */
export type SessionRepository = AbstractRepositoryInterface<
	SessionEntity,
	[],
	{
		/**
		 * Finds a user for a session based on user info (e.g., from OAuth/OpenID).
		 * Returns undefined if the user is not allowed.
		 */
		findUserForSession(user: {
			userId?: string;
			name?: string;
			email?: string;
			profilePictureUrl?: string;
		}): Promise<UserEntity | undefined>;

		/**
		 * Retrieves a session by its sessionId.
		 */
		getSession(sessionId: string): Promise<SessionEntity | null>;

		/**
		 * Creates a new session.
		 */
		createSession(
			session: Omit<SessionEntity, 'sessionId' | 'createdAt' | 'updatedAt'> &
				Partial<SessionEntity>,
		): Promise<SessionEntity>;

		/**
		 * Updates an existing session by sessionId.
		 */
		updateSession(
			sessionId: SessionEntity['sessionId'],
			session: Partial<Omit<SessionEntity, 'sessionId'>>,
		): Promise<void>;

		/**
		 * Deletes a session by sessionId.
		 */
		deleteSession(sessionId: SessionEntity['sessionId']): Promise<void>;
	}
>;

import type { SessionEntity } from '@/backend/entities/session.entity';
import type { AbstractRepositoryInterface } from '../abstract-repository';

/**
 * Interface for all Session repositories (DynamoDB, Postgres, SQLite).
 */
export type SessionRepository = AbstractRepositoryInterface<
	SessionEntity,
	[],
	{
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

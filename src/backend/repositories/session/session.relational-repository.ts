import { shouldRegister } from '../../services/should-register';

import { SessionOrmEntity } from './relational-orm-entity';
import type { SessionRepository } from './interface';
import { SESSION_REPOSITORY, SESSION_REPO_NAME } from './di-tokens';

import { Inject, Service } from '@/common/di';
import { Logger } from '@/backend/services/logger.service';
import { RelationalDbService } from '@/backend/services/relationaldb.service';
import { AbstractRelationalRepository } from '@/backend/repositories/abstract-relational-repository';
import { SessionEntity } from '@/backend/entities/session.entity';
import { UserEntity } from '@/backend/entities/user.entity';
import { DatabaseType } from '@/backend/services/constants';

function getAllowedEmails() {
	return new Set((process.env.ALLOWED_EMAILS || '').split(','));
}

@Service({
	name: SESSION_REPOSITORY,
	...shouldRegister(DatabaseType.POSTGRES),
	...shouldRegister(DatabaseType.SQLITE),
})
/**
 * Relational DB implementation of the SessionRepository interface.
 */
export class SessionRelationalRepository
	extends AbstractRelationalRepository<SessionOrmEntity, SessionEntity, []>
	implements SessionRepository
{
	protected logger = new Logger(SESSION_REPO_NAME);

	constructor(@Inject(RelationalDbService) db: RelationalDbService) {
		super({ db, ormEntityClass: SessionOrmEntity });
	}

	/**
	 * Converts a TypeORM SessionOrmEntity to a domain SessionEntity.
	 */
	protected ormToDomainEntitySafe(orm: SessionOrmEntity): SessionEntity {
		return new SessionEntity({
			sessionId: orm.sessionId,
			userId: orm.userId,
			renewalId: orm.renewalId,
			expiresAt: orm.expiresAt,
			createdAt: orm.createdAt,
			updatedAt: orm.updatedAt,
		});
	}

	/**
	 * Converts a domain SessionEntity to a TypeORM SessionOrmEntity.
	 */
	protected domainToOrmEntity(domain: SessionEntity): SessionOrmEntity {
		return {
			sessionId: domain.sessionId,
			userId: domain.userId,
			renewalId: domain.renewalId,
			expiresAt: domain.expiresAt,
			createdAt: domain.createdAt,
			updatedAt: domain.updatedAt,
		};
	}

	/**
	 * Generates an empty SessionEntity with the given id.
	 */
	protected generateEmptyItem(id: string): SessionEntity {
		return new SessionEntity({
			sessionId: id,
			userId: '',
			renewalId: '',
			expiresAt: new Date(),
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}

	/**
	 * Finds a user for a session based on user info (e.g., from OAuth/OpenID).
	 * Returns undefined if the user is not allowed.
	 */
	public async findUserForSession(user: {
		userId?: string;
		name?: string;
		email?: string;
		profilePictureUrl?: string;
	}): Promise<UserEntity | undefined> {
		if (!user.email || !user.name || !user.userId) {
			return undefined;
		}
		if (getAllowedEmails().has(user.email)) {
			return new UserEntity(user);
		}
		return undefined;
	}

	/**
	 * Retrieves a session by its sessionId.
	 */
	public async getSession(sessionId: string): Promise<SessionEntity | null> {
		await this.initialized.promise;
		const found = await this.repository!.findOneBy({ sessionId });
		return found ? this.ormToDomainEntitySafe(found) : null;
	}

	/**
	 * Creates a new session.
	 */
	public async createSession(
		session: Omit<SessionEntity, 'sessionId' | 'createdAt' | 'updatedAt'> &
			Partial<SessionEntity>,
	): Promise<SessionEntity> {
		await this.initialized.promise;
		const sessionId = crypto.randomUUID();
		const now = new Date();
		const entity = this.domainToOrmEntity({
			...session,
			sessionId,
			createdAt: session.createdAt || now,
			updatedAt: session.updatedAt || now,
		} as SessionEntity);
		const saved = await this.repository!.save(entity);
		return this.ormToDomainEntitySafe(saved);
	}

	/**
	 * Updates an existing session by sessionId.
	 */
	public async updateSession(
		sessionId: SessionEntity['sessionId'],
		session: Partial<Omit<SessionEntity, 'sessionId'>>,
	): Promise<void> {
		await this.initialized.promise;
		const found = await this.repository!.findOneBy({ sessionId });
		if (!found) {
			throw new Error('Entry (Session) not found');
		}
		const updated = this.domainToOrmEntity({
			...found,
			...session,
			sessionId,
			updatedAt: new Date(),
		} as SessionEntity);
		await this.repository!.save(updated);
	}

	/**
	 * Deletes a session by sessionId.
	 */
	public async deleteSession(
		sessionId: SessionEntity['sessionId'],
	): Promise<void> {
		await this.initialized.promise;
		await this.repository!.delete({ sessionId });
	}
}

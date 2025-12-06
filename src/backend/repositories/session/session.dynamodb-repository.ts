import { randomUUID } from 'node:crypto';
import { SessionEntity } from '@/backend/entities/session.entity';
import { UserEntity } from '@/backend/entities/user.entity';
import { AbstractDynamodbRepository } from '@/backend/repositories/abstract-dynamodb-repository';
import { DatabaseType } from '@/backend/services/constants';
import {
	DYNAMODB_SERVICE,
	EVENTBUS_SERVICE,
} from '@/backend/services/di-tokens';
import type { DynamoDBService } from '@/backend/services/dynamodb.service';
import type { EventBusService } from '@/backend/services/eventbus.service';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';
import { shouldRegister } from '../../services/should-register';
import { DYNAMODB_REPOSITORY_TEST_SET } from '../di-tokens';
import { SESSION_REPO_NAME, SESSION_REPOSITORY } from './di-tokens';
import { entitySchema, type SessionOrmEntity } from './dynamodb-orm-entity';
import type { SessionRepository } from './interface';

const storeId = 'sessions';

function getAllowedEmails() {
	return new Set((process.env.ALLOWED_EMAILS || '').split(','));
}

@Service({
	name: SESSION_REPOSITORY,
	...shouldRegister(DatabaseType.DYNAMODB),
	addToTestSet: [DYNAMODB_REPOSITORY_TEST_SET],
})
/**
 * DynamoDB implementation of the SessionRepository interface.
 */
export class SessionDynamodbRepository
	extends AbstractDynamodbRepository<
		SessionOrmEntity,
		SessionEntity,
		[],
		typeof entitySchema.schema
	>
	implements SessionRepository
{
	protected logger = new Logger(SESSION_REPO_NAME);
	protected mainIdName: string = 'sessionId';
	protected storeId: string = storeId;

	constructor(
		@Inject(DYNAMODB_SERVICE) private dynamoDb: DynamoDBService,
		@Inject(EVENTBUS_SERVICE) protected eventBus: EventBusService,
	) {
		super();
		this.eventBus = eventBus;
		this.store = this.dynamoDb.getEntity(entitySchema.schema);
	}

	/**
	 * Converts a DynamoDB ORM entity to a domain SessionEntity.
	 */
	protected ormToDomainEntitySafe(
		entity: Omit<SessionOrmEntity, 'storeId'>,
	): SessionEntity {
		return new SessionEntity({
			sessionId: entity.sessionId,
			userId: entity.userId,
			renewalId: entity.renewalId,
			expiresAt: new Date(entity.expiresAt),
			createdAt: new Date(entity.createdAt),
			updatedAt: new Date(entity.updatedAt),
		});
	}

	/**
	 * Converts a domain SessionEntity to a DynamoDB ORM entity.
	 */
	public domainToOrmEntity(
		domainEntity: SessionEntity,
	): Omit<SessionOrmEntity, 'storeId'> {
		return {
			sessionId: domainEntity.sessionId,
			userId: domainEntity.userId,
			renewalId: domainEntity.renewalId,
			expiresAt: domainEntity.expiresAt.toISOString(),
			createdAt: domainEntity.createdAt.toISOString(),
			updatedAt: domainEntity.updatedAt.toISOString(),
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
		const data = await this.store
			.get({ sessionId, storeId: this.storeId })
			.go();
		if (!data || !data.data) {
			return null;
		}
		return this.ormToDomainEntitySafe(data.data);
	}

	/**
	 * Creates a new session.
	 */
	public async createSession(
		session: Omit<SessionEntity, 'sessionId' | 'createdAt' | 'updatedAt'> &
			Partial<SessionEntity>,
	): Promise<SessionEntity> {
		const sessionId = randomUUID().toString();
		const now = new Date();
		const data = this.domainToOrmEntity({
			...session,
			sessionId,
			createdAt: session.createdAt || now,
			updatedAt: session.updatedAt || now,
		} as SessionEntity);
		await this.store.create({ ...data, storeId: this.storeId }).go();
		return this.ormToDomainEntitySafe(data);
	}

	/**
	 * Updates an existing session by sessionId.
	 */
	public async updateSession(
		sessionId: SessionEntity['sessionId'],
		session: Partial<Omit<SessionEntity, 'sessionId'>>,
	): Promise<void> {
		const entry = await this.getSession(sessionId);
		if (!entry) {
			throw new Error('Entry (Session) not found');
		}
		const data = this.domainToOrmEntity({
			...entry,
			...session,
			sessionId,
			updatedAt: new Date(),
		} as SessionEntity);
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { sessionId: _omit, ...patchData } = data;
		await this.store
			.patch({ sessionId, storeId: this.storeId })
			.set(patchData)
			.go();
	}

	/**
	 * Deletes a session by sessionId.
	 */
	public async deleteSession(
		sessionId: SessionEntity['sessionId'],
	): Promise<void> {
		await this.store.delete({ sessionId, storeId: this.storeId }).go();
	}
}

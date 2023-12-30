/* eslint-disable @typescript-eslint/no-unused-vars */
import { randomUUID } from 'crypto';

import { Entity, Schema } from 'electrodb';

import { DBService } from '../services/dynamodb.service';

import { Inject, Service } from '@/common/di';

export class UserEntity {
	public userId!: string;
	public name!: string;
	public email!: string;
	public roles!: string[];

	constructor(props: Partial<UserEntity>) {
		Object.assign(this, props);
	}
}

export class SessionEntity {
	public sessionId!: string;
	public userId!: string;
	public renewalId!: string;
	public expiresAt!: Date;
	public createdAt!: Date;
	public updatedAt!: Date;

	constructor(props: Partial<SessionEntity>) {
		Object.assign(this, props);
	}
}

const storeId = 'sessions';

// For now the user system is based on
// Google Oauth/ OpenID. Google takes care
// of the authentication and we just need
// to verify the token and extract the user
// information.
// If the email address of the user is in
// the ALLOWED_EMAILS environment variable
// the user is allowed to use the system.

const ALLOWED_EMAILS = process.env.ALLOWED_EMAILS || '';
const allowedEmails = new Set(ALLOWED_EMAILS.split(','));

const entitySchema = DBService.getSchema({
	model: {
		entity: 'session',
		version: '1',
		service: 'user',
	},
	attributes: {
		userId: {
			type: 'string',
		},
		sessionId: {
			type: 'string',
			required: true,
		},
		storeId: {
			type: 'string',
			required: true,
		},
		renewalId: {
			type: 'string',
			required: true,
		},

		expiresAt: {
			type: 'string',
			required: true,
		},
		createdAt: {
			type: 'string',
			required: true,
		},
		updatedAt: {
			type: 'string',
			required: true,
		},
	},
	indexes: {
		bySessionId: {
			pk: {
				field: 'pk',
				composite: ['sessionId'],
			},
			sk: {
				field: 'sk',
				composite: ['storeId'],
			},
		},
		byUserId: {
			index: 'gsi1pk-gsi1sk-index',
			pk: {
				field: 'gsi1pk',
				composite: ['userId'],
			},
			sk: {
				field: 'gsi1sk',
				composite: ['expiresAt'],
			},
		},
	},
});

type SessionStore = typeof entitySchema.entityStoreType;

export type SessionOrmEntity = typeof entitySchema.responseItem;

@Service()
export class SessionRepository {
	private store: SessionStore;
	constructor(@Inject(DBService) private dynamoDb: DBService) {
		this.store = this.dynamoDb.getEntity(entitySchema.schema);
	}

	private ormToDomainEntity(ormEntity: {
		data: Omit<SessionOrmEntity, 'storeId'>;
	}): SessionEntity;
	private ormToDomainEntity(ormEntity?: {
		data?: Omit<SessionOrmEntity, 'storeId'> | null;
	}): SessionEntity | null;
	private ormToDomainEntity(ormEntity?: {
		data?: Omit<SessionOrmEntity, 'storeId'> | null;
	}): SessionEntity | null {
		if (!ormEntity || !ormEntity.data) {
			return null;
		}
		return new SessionEntity({
			sessionId: ormEntity.data.sessionId,
			userId: ormEntity.data.userId,
			renewalId: ormEntity.data.renewalId,
			expiresAt: new Date(ormEntity.data.expiresAt),
			createdAt: new Date(ormEntity.data.createdAt),
			updatedAt: new Date(ormEntity.data.updatedAt),
		});
	}

	private domainToOrmEntity(
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

	public async findUserForSession(user: {
		userId?: string;
		name?: string;
		email?: string;
	}): Promise<UserEntity | undefined> {
		if (!user.email || !user.name || !user.userId) {
			return undefined;
		}
		if (allowedEmails.has(user.email)) {
			return new UserEntity(user);
		}
		return undefined;
	}

	public async getSession(sessionId: string): Promise<SessionEntity | null> {
		const data = this.ormToDomainEntity(
			await this.store
				.get({
					sessionId,
					storeId,
				})
				.go(),
		);
		return data;
	}

	public async createSession(
		session: Omit<SessionEntity, 'sessionId' | 'createdAt' | 'updatedAt'> &
			Partial<SessionEntity>,
	): Promise<SessionEntity> {
		const sessionId = randomUUID().toString();
		const data = this.domainToOrmEntity({
			...session,
			sessionId,
			createdAt: session.createdAt || new Date(),
			updatedAt: session.updatedAt || new Date(),
		});
		await this.store.create({ ...data, storeId }).go();
		return this.ormToDomainEntity({ data });
	}

	public async updateSession(
		sessionId: SessionEntity['sessionId'],
		session: Partial<Omit<SessionEntity, 'sessionId'>>,
	): Promise<void> {
		const entry = this.ormToDomainEntity(
			await this.store
				.get({
					sessionId,
					storeId,
				})
				.go(),
		);
		if (!entry) {
			throw new Error('Entry (Session) not found');
		}

		const { sessionId: ignoreSessionId, ...data } = this.domainToOrmEntity({
			...entry,
			...session,
			sessionId,
			updatedAt: new Date(),
		});

		await this.store
			.patch({
				sessionId,
				storeId,
			})
			.set(data)
			.go();
	}

	public async deleteSession(
		sessionId: SessionEntity['sessionId'],
	): Promise<void> {
		await this.store
			.delete({
				sessionId,
				storeId,
			})
			.go();
	}
}

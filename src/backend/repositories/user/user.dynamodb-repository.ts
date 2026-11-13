import {
	UserEntity,
	type UserIdentity,
	UserRole,
} from '@/backend/entities/user.entity';
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
import { USER_REPO_NAME, USER_REPOSITORY } from './di-tokens';
import { entitySchema, type UserOrmEntity } from './dynamodb-orm-entity';
import type { UserRepository } from './interface';

const parseIdentities = (raw?: string): UserIdentity[] => {
	if (!raw) {
		return [];
	}
	try {
		const parsed = JSON.parse(raw) as UserIdentity[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};

/**
 * DynamoDB implementation of the UserRepository interface.
 */
@Service({
	name: USER_REPOSITORY,
	...shouldRegister(DatabaseType.DYNAMODB),
	addToTestSet: [DYNAMODB_REPOSITORY_TEST_SET],
})
export class UserDynamodbRepository
	extends AbstractDynamodbRepository<
		UserOrmEntity,
		UserEntity,
		[],
		typeof entitySchema.schema
	>
	implements UserRepository
{
	protected logger = new Logger(USER_REPO_NAME);
	protected mainIdName: string = 'userId';
	protected storeId: string = 'users';

	constructor(
		@Inject(DYNAMODB_SERVICE) private dynamoDb: DynamoDBService,
		@Inject(EVENTBUS_SERVICE) protected eventBus: EventBusService,
	) {
		super();
		this.eventBus = eventBus;
		this.store = this.dynamoDb.getEntity(entitySchema.schema);
	}

	protected ormToDomainEntitySafe(
		entity: Omit<UserOrmEntity, 'storeId'>,
	): UserEntity {
		return new UserEntity({
			id: entity.userId,
			email: entity.email,
			name: entity.name,
			role: (entity.role as UserRole) || UserRole.USER,
			passwordHash: entity.passwordHash || undefined,
			identities: parseIdentities(entity.identities),
			disabled: !!entity.disabled,
			profilePictureUrl: entity.profilePictureUrl || undefined,
			lastLoginAt: entity.lastLoginAt
				? new Date(entity.lastLoginAt)
				: undefined,
			failedLoginCount: entity.failedLoginCount || 0,
			lockedUntil: entity.lockedUntil
				? new Date(entity.lockedUntil)
				: undefined,
			createdAt: new Date(entity.createdAt),
			updatedAt: new Date(entity.updatedAt),
		});
	}

	public domainToOrmEntity(
		domainEntity: UserEntity,
	): Omit<UserOrmEntity, 'storeId'> {
		return {
			userId: domainEntity.id,
			email: domainEntity.email,
			name: domainEntity.name,
			role: domainEntity.role,
			passwordHash: domainEntity.passwordHash || '',
			identities: JSON.stringify(domainEntity.identities || []),
			disabled: !!domainEntity.disabled,
			profilePictureUrl: domainEntity.profilePictureUrl || '',
			lastLoginAt: domainEntity.lastLoginAt?.toISOString() || '',
			failedLoginCount: domainEntity.failedLoginCount || 0,
			lockedUntil: domainEntity.lockedUntil?.toISOString() || '',
			createdAt: domainEntity.createdAt.toISOString(),
			updatedAt: domainEntity.updatedAt.toISOString(),
		};
	}

	protected generateEmptyItem(id: string): UserEntity {
		return new UserEntity({ id, name: '', email: `${id}@users.invalid` });
	}

	public async listAll(): Promise<UserEntity[]> {
		const result = await this.store.query
			.byEmail({ storeId: this.storeId })
			.go({ pages: 'all' });
		return result.data.map((elm) => this.ormToDomainEntity(elm));
	}

	public async findByEmail(email: string): Promise<UserEntity | null> {
		const result = await this.store.query
			.byEmail({
				storeId: this.storeId,
				email: UserEntity.normalizeEmail(email),
			})
			.go();
		const [first] = result.data;
		return first ? this.ormToDomainEntity(first) : null;
	}

	public async findByIdentity(
		provider: string,
		subject: string,
	): Promise<UserEntity | null> {
		// The number of users is small, so a query over the user partition is fine.
		const users = await this.listAll();
		return users.find((user) => user.hasIdentity(provider, subject)) || null;
	}
}

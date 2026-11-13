import { UserEntity, UserRole } from '@/backend/entities/user.entity';
import { AbstractRelationalRepository } from '@/backend/repositories/abstract-relational-repository';
import { DatabaseType } from '@/backend/services/constants';
import {
	EVENTBUS_SERVICE,
	RELATIONALDB_SERVICE,
} from '@/backend/services/di-tokens';
import type { EventBusService } from '@/backend/services/eventbus.service';
import { Logger } from '@/backend/services/logger.service';
import type { RelationalDbService } from '@/backend/services/relationaldb.service';
import { Inject, Service } from '@/common/di';
import { shouldRegister } from '../../services/should-register';
import { RELATIONAL_REPOSITORY_TEST_SET } from '../di-tokens';
import { USER_REPO_NAME, USER_REPOSITORY } from './di-tokens';
import type { UserRepository } from './interface';
import { UserOrmEntity } from './relational-orm-entity';

/**
 * Relational DB (Postgres/SQLite) implementation of the UserRepository interface.
 */
@Service({
	name: USER_REPOSITORY,
	...shouldRegister([DatabaseType.POSTGRES, DatabaseType.SQLITE]),
	addToTestSet: [RELATIONAL_REPOSITORY_TEST_SET],
})
export class UserRelationalRepository
	extends AbstractRelationalRepository<UserOrmEntity, UserEntity, []>
	implements UserRepository
{
	protected logger = new Logger(USER_REPO_NAME);

	constructor(
		@Inject(RELATIONALDB_SERVICE) db: RelationalDbService,
		@Inject(EVENTBUS_SERVICE) protected eventBus: EventBusService,
	) {
		super({ db, ormEntityClass: UserOrmEntity });
		this.eventBus = eventBus;
	}

	protected ormToDomainEntitySafe(orm: UserOrmEntity): UserEntity {
		return new UserEntity({
			id: orm.id,
			email: orm.email,
			name: orm.name,
			role: (orm.role as UserRole) || UserRole.USER,
			passwordHash: orm.passwordHash || undefined,
			identities: orm.identities || [],
			disabled: !!orm.disabled,
			profilePictureUrl: orm.profilePictureUrl || undefined,
			lastLoginAt: orm.lastLoginAt || undefined,
			failedLoginCount: orm.failedLoginCount || 0,
			lockedUntil: orm.lockedUntil || undefined,
			createdAt: orm.createdAt,
			updatedAt: orm.updatedAt,
		});
	}

	protected domainToOrmEntity(domain: UserEntity): UserOrmEntity {
		return {
			id: domain.id,
			email: domain.email,
			name: domain.name,
			role: domain.role,
			passwordHash: domain.passwordHash || null,
			identities: domain.identities || [],
			disabled: !!domain.disabled,
			profilePictureUrl: domain.profilePictureUrl || null,
			lastLoginAt: domain.lastLoginAt || null,
			failedLoginCount: domain.failedLoginCount || 0,
			lockedUntil: domain.lockedUntil || null,
			createdAt: domain.createdAt,
			updatedAt: domain.updatedAt,
		};
	}

	protected generateEmptyItem(id: string): UserEntity {
		return new UserEntity({ id, name: '', email: `${id}@users.invalid` });
	}

	public async listAll(): Promise<UserEntity[]> {
		await this.initialized.promise;
		const rows = await this.repository!.find({ order: { email: 'ASC' } });
		return rows.map((row) => this.ormToDomainEntity(row));
	}

	public async findByEmail(email: string): Promise<UserEntity | null> {
		await this.initialized.promise;
		const row = await this.repository!.findOneBy({
			email: UserEntity.normalizeEmail(email),
		});
		return row ? this.ormToDomainEntity(row) : null;
	}

	public async findByIdentity(
		provider: string,
		subject: string,
	): Promise<UserEntity | null> {
		const users = await this.listAll();
		return users.find((user) => user.hasIdentity(provider, subject)) || null;
	}
}

import { EmailEntity } from '@/backend/entities/email.entity';
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
import { EMAIL_REPO_NAME, EMAIL_REPOSITORY } from './di-tokens';
import type { EmailRepository } from './index';
import { EmailOrmEntity } from './relational-orm-entity';

/**
 * Unified repository for Email using TypeORM (Postgres or SQLite).
 * Handles mapping between EmailOrmEntity and EmailEntity.
 */
@Service({
	name: EMAIL_REPOSITORY,
	...shouldRegister([DatabaseType.POSTGRES, DatabaseType.SQLITE]),
	addToTestSet: [RELATIONAL_REPOSITORY_TEST_SET],
})
export class EmailRelationalRepository
	extends AbstractRelationalRepository<EmailOrmEntity, EmailEntity, []>
	implements EmailRepository
{
	/** Logger instance for this repository. */
	protected logger = new Logger(EMAIL_REPO_NAME);

	constructor(
		@Inject(RELATIONALDB_SERVICE) db: RelationalDbService,
		@Inject(EVENTBUS_SERVICE) protected eventBus: EventBusService,
	) {
		super({ db, ormEntityClass: EmailOrmEntity });
		this.eventBus = eventBus;
	}

	/**
	 * Converts a TypeORM EmailOrmEntity to a domain EmailEntity.
	 */
	public ormToDomainEntitySafe(orm: EmailOrmEntity): EmailEntity {
		return new EmailEntity({
			id: orm.id,
			entityType: orm.entityType,
			entityId: orm.entityId,
			recipient: orm.recipient,
			sentAt: orm.sentAt,
		});
	}

	/**
	 * Converts a domain EmailEntity to a TypeORM EmailOrmEntity.
	 */
	public domainToOrmEntity(domain: EmailEntity): EmailOrmEntity {
		return {
			id: domain.id,
			entityType: domain.entityType,
			entityId: domain.entityId,
			recipient: domain.recipient,
			sentAt: domain.sentAt,
		};
	}

	/**
	 * Generates an empty EmailEntity with the given id.
	 */
	protected generateEmptyItem(id: string): EmailEntity {
		return new EmailEntity({
			id,
			entityType: '',
			entityId: '',
			recipient: '',
			sentAt: new Date(),
		});
	}

	/**
	 * Lists emails by query (search, skip, limit).
	 * @param query Query object with optional search, skip, limit, cursor
	 * @returns Array of EmailEntity
	 */
	public async listByQuery(query: {
		where?: { search?: string };
		skip?: number;
		limit?: number;
		cursor?: string;
	}): Promise<EmailEntity[]> {
		await this.initialized.promise;

		const qb = this.repository!.createQueryBuilder('email');
		if (query.where?.search) {
			qb.andWhere('LOWER(email.recipient) LIKE :search', {
				search: `%${query.where.search.toLowerCase()}%`,
			});
		}
		if (query.skip) {
			qb.skip(query.skip);
		}
		if (query.limit) {
			qb.take(query.limit);
		}
		const results = await qb.getMany();
		return results.map((orm) => this.ormToDomainEntitySafe(orm));
	}
}

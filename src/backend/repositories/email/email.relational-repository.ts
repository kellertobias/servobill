import { shouldRegister } from '../../services/should-register';

import { EMAIL_REPOSITORY, EMAIL_REPO_NAME } from './di-tokens';
import { EmailOrmEntity } from './relational-orm-entity';

import type { EmailRepository } from './index';

import { Inject, Service } from '@/common/di';
import { EmailEntity } from '@/backend/entities/email.entity';
import { Logger } from '@/backend/services/logger.service';
import { AbstractRelationalRepository } from '@/backend/repositories/abstract-relational-repository';
import { DatabaseType } from '@/backend/services/constants';
import { RelationalDbService } from '@/backend/services/relationaldb.service';


/**
 * Unified repository for Email using TypeORM (Postgres or SQLite).
 * Handles mapping between EmailOrmEntity and EmailEntity.
 */
@Service({
	name: EMAIL_REPOSITORY,
	...shouldRegister(DatabaseType.POSTGRES),
	...shouldRegister(DatabaseType.SQLITE),
})
export class EmailRelationalRepository
	extends AbstractRelationalRepository<EmailOrmEntity, EmailEntity, []>
	implements EmailRepository
{
	/** Logger instance for this repository. */
	protected logger = new Logger(EMAIL_REPO_NAME);

	constructor(@Inject(RelationalDbService) db: RelationalDbService) {
		super({ db, ormEntityClass: EmailOrmEntity });
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
		const qb = this.repository!.createQueryBuilder('email');
		if (query.where?.search) {
			qb.andWhere('LOWER(email.recipient) LIKE :search', {
				search: `%${query.where.search.toLowerCase()}%`,
			});
		}
		if (query.skip) 
{qb.skip(query.skip);}
		if (query.limit) 
{qb.take(query.limit);}
		const results = await qb.getMany();
		return results.map((orm) => this.ormToDomainEntitySafe(orm));
	}
}

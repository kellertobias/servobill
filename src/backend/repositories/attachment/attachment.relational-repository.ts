import { IsNull } from 'typeorm';

import { AbstractRelationalRepository } from '../abstract-relational-repository';

import { AttachmentOrmEntity } from './relational-orm-entity';
import { AttachmentCreateInput } from './interface';
import { ATTACHMENT_REPO_NAME, ATTACHMENT_REPOSITORY } from './di-tokens';

import { Inject, Service } from '@/common/di';
import { RelationalDbService } from '@/backend/services/relationaldb.service';
import { AttachmentEntity } from '@/backend/entities/attachment.entity';
import { Logger } from '@/backend/services/logger.service';
import { DatabaseType } from '@/backend/services/constants';
import { shouldRegister } from '@/backend/services/should-register';

/**
 * Repository for managing AttachmentEntity records in a relational database.
 */
@Service({
	name: ATTACHMENT_REPOSITORY,
	...shouldRegister([DatabaseType.POSTGRES, DatabaseType.SQLITE]),
})
export class AttachmentRelationalRepository extends AbstractRelationalRepository<
	AttachmentOrmEntity,
	AttachmentEntity,
	[AttachmentCreateInput]
> {
	protected logger = new Logger(ATTACHMENT_REPO_NAME);

	constructor(@Inject(RelationalDbService) db: RelationalDbService) {
		super({ db, ormEntityClass: AttachmentOrmEntity });
	}

	/**
	 * Converts a TypeORM AttachmentOrmEntity to a domain AttachmentEntity.
	 */
	public ormToDomainEntity(orm: AttachmentOrmEntity): AttachmentEntity {
		return new AttachmentEntity({
			id: orm.id,
			createdAt: orm.createdAt,
			updatedAt: orm.updatedAt,
			fileName: orm.fileName,
			mimeType: orm.mimeType,
			size: orm.size,
			s3Key: orm.s3Key,
			s3Bucket: orm.s3Bucket,
			status: orm.status as 'pending' | 'finished',
			invoiceId: orm.invoiceId,
			expenseId: orm.expenseId,
			inventoryId: orm.inventoryId,
		});
	}

	/**
	 * Safe conversion for ORM entity to domain entity (alias for ormToDomainEntity).
	 */
	public ormToDomainEntitySafe(orm: AttachmentOrmEntity): AttachmentEntity {
		return this.ormToDomainEntity(orm);
	}

	/**
	 * Converts a domain AttachmentEntity to a TypeORM AttachmentOrmEntity.
	 */
	public domainToOrmEntity(domain: AttachmentEntity): AttachmentOrmEntity {
		return {
			id: domain.id,
			createdAt: domain.createdAt,
			updatedAt: domain.updatedAt,
			fileName: domain.fileName,
			mimeType: domain.mimeType,
			size: domain.size,
			s3Key: domain.s3Key,
			s3Bucket: domain.s3Bucket,
			status: domain.status,
			invoiceId: domain.invoiceId,
			expenseId: domain.expenseId,
			inventoryId: domain.inventoryId,
		};
	}

	/**
	 * Generates an empty AttachmentEntity with the given parameters.
	 */
	public generateEmptyItem(
		id: string,
		input: AttachmentCreateInput,
	): AttachmentEntity {
		return new AttachmentEntity({
			id,
			...input,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}

	/**
	 * List attachments by query, filtering by linked entity IDs.
	 */
	public async listByQuery(query: {
		invoiceId?: string;
		expenseId?: string;
		inventoryId?: string;
		skip?: number;
		limit?: number;
		cursor?: string;
	}): Promise<AttachmentEntity[]> {
		await this.initialized.promise;

		const qb = this.repository!.createQueryBuilder('attachment');
		if (query.invoiceId) {
			qb.andWhere('attachment.invoiceId = :invoiceId', {
				invoiceId: query.invoiceId,
			});
		}
		if (query.expenseId) {
			qb.andWhere('attachment.expenseId = :expenseId', {
				expenseId: query.expenseId,
			});
		}
		if (query.inventoryId) {
			qb.andWhere('attachment.inventoryId = :inventoryId', {
				inventoryId: query.inventoryId,
			});
		}
		if (query.skip) {
			qb.skip(query.skip);
		}
		if (query.limit) {
			qb.take(query.limit);
		}
		const results = await qb.getMany();
		return results.map((orm) => this.ormToDomainEntity(orm));
	}

	/**
	 * Delete all orphaned attachments (not linked to any entity).
	 * Returns the number of deleted attachments.
	 */
	public async deleteOrphaned(): Promise<number> {
		const orphaned = await this.repository!.find({
			where: {
				invoiceId: IsNull(),
				expenseId: IsNull(),
				inventoryId: IsNull(),
			},
		});
		const ids = orphaned.map((a) => a.id);
		if (ids.length > 0) {
			await this.repository!.delete(ids);
		}
		return ids.length;
	}
}

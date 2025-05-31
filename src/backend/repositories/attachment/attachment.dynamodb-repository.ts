import { AbstractDynamodbRepository } from '../abstract-dynamodb-repository';

import {
	entitySchema,
	AttachmentOrmEntity,
	AttachmentSchema,
} from './dynamodb-orm-entity';
import { AttachmentCreateInput } from './interface';
import { ATTACHMENT_REPO_NAME, ATTACHMENT_REPOSITORY } from './di-tokens';

import { AttachmentEntity } from '@/backend/entities/attachment.entity';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';
import { DynamoDBService } from '@/backend/services/dynamodb.service';
import { shouldRegister } from '@/backend/services/should-register';
import { DatabaseType } from '@/backend/services/constants';

/**
 * DynamoDB repository for managing AttachmentEntity records.
 */
@Service({
	name: ATTACHMENT_REPOSITORY,
	...shouldRegister(DatabaseType.DYNAMODB),
})
export class AttachmentDynamoDBRepository extends AbstractDynamodbRepository<
	AttachmentOrmEntity,
	AttachmentEntity,
	[AttachmentCreateInput],
	AttachmentSchema
> {
	protected logger = new Logger(ATTACHMENT_REPO_NAME);
	protected mainIdName = 'attachmentId';
	protected storeId = 'Attachment';

	constructor(@Inject(DynamoDBService) private dynamoDb: DynamoDBService) {
		super();
		this.store = this.dynamoDb.getEntity(entitySchema.schema);
	}

	/**
	 * Converts a DynamoDB record to a domain AttachmentEntity.
	 */
	public ormToDomainEntitySafe(orm: AttachmentOrmEntity): AttachmentEntity {
		return new AttachmentEntity({
			id: orm.attachmentId,
			createdAt: new Date(orm.createdAt),
			updatedAt: new Date(orm.updatedAt),
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
	 * Converts a domain AttachmentEntity to a DynamoDB record.
	 * Sets 'linkedId' to the first available link or 'orphaned'.
	 */
	public domainToOrmEntity(
		domain: AttachmentEntity,
	): Omit<AttachmentOrmEntity, 'storeId'> {
		let linkedId = 'orphaned';
		if (domain.invoiceId) 
{linkedId = domain.invoiceId;}
		else if (domain.expenseId) 
{linkedId = domain.expenseId;}
		else if (domain.inventoryId) 
{linkedId = domain.inventoryId;}
		return {
			attachmentId: domain.id,
			createdAt: domain.createdAt.toISOString(),
			updatedAt: domain.updatedAt.toISOString(),
			fileName: domain.fileName,
			mimeType: domain.mimeType,
			size: domain.size,
			s3Key: domain.s3Key,
			s3Bucket: domain.s3Bucket,
			status: domain.status,
			invoiceId: domain.invoiceId,
			expenseId: domain.expenseId,
			inventoryId: domain.inventoryId,
			linkedId,
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
			fileName: input.fileName,
			mimeType: input.mimeType,
			size: input.size,
			s3Key: input.s3Key,
			s3Bucket: input.s3Bucket,
			status: 'pending',
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}

	/**
	 * List attachments by query, filtering by linked entity IDs.
	 * Uses the single 'linkedId' GSI for all queries.
	 */
	public async listByQuery(query: {
		invoiceId?: string;
		expenseId?: string;
		inventoryId?: string;
		skip?: number;
		limit?: number;
		cursor?: string;
	}): Promise<AttachmentEntity[]> {
		let linkedId: string | undefined;
		if (query.invoiceId) 
{linkedId = query.invoiceId;}
		else if (query.expenseId) 
{linkedId = query.expenseId;}
		else if (query.inventoryId) 
{linkedId = query.inventoryId;}
		let data: AttachmentOrmEntity[] = [];
		if (linkedId) {
			const result = await this.store.query.byLinkedId({ linkedId }).go();
			data = result.data;
		} else {
			// List all (not recommended for large tables)
			const result = await this.store.query
				.byLinkedId({ linkedId: 'orphaned' })
				.go();
			data = result.data;
		}
		return data.map((orm) => this.ormToDomainEntitySafe(orm));
	}

	/**
	 * Delete all orphaned attachments (not linked to any entity).
	 * Returns the number of deleted attachments.
	 * Uses the single 'linkedId' GSI with 'orphaned'.
	 */
	public async deleteOrphaned(): Promise<number> {
		const result = await this.store.query
			.byLinkedId({ linkedId: 'orphaned' })
			.go();
		const orphaned = result.data;
		for (const a of orphaned) {
			await this.delete(a.attachmentId);
		}
		return orphaned.length;
	}
}

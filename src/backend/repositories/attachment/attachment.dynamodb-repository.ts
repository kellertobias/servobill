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
	 */
	public domainToOrmEntity(domain: AttachmentEntity): AttachmentOrmEntity {
		return {
			storeId: this.storeId,
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
		} as AttachmentOrmEntity;
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
	 */
	public async listByQuery(query: {
		invoiceId?: string;
		expenseId?: string;
		inventoryId?: string;
		skip?: number;
		limit?: number;
		cursor?: string;
	}): Promise<AttachmentEntity[]> {
		// Use the appropriate GSI based on the filter
		if (query.invoiceId) {
			// Query by invoiceId
			// TODO: Implement actual ElectroDB query using GSI
		} else if (query.expenseId) {
			// Query by expenseId
			// TODO: Implement actual ElectroDB query using GSI
		} else if (query.inventoryId) {
			// Query by inventoryId
			// TODO: Implement actual ElectroDB query using GSI
		} else {
			// List all (not recommended for large tables)
			// TODO: Implement scan or paginated query
		}
		return [];
	}

	/**
	 * Delete all orphaned attachments (not linked to any entity).
	 * Returns the number of deleted attachments.
	 */
	public async deleteOrphaned(): Promise<number> {
		// TODO: Query byOrphaned index and delete all matching items
		return 0;
	}
}

import type { AttachmentEntity } from '@/backend/entities/attachment.entity';
import type { AbstractRepositoryInterface } from '../abstract-repository';

export type AttachmentCreateInput = {
	fileName: string;
	mimeType: string;
	size: number;
	s3Key: string;
	s3Bucket: string;
	expenseIds?: string[];
};

/**
 * Interface for all Attachment repositories (DynamoDB, Postgres, SQLite).
 */
export type AttachmentRepository = AbstractRepositoryInterface<
	AttachmentEntity,
	[AttachmentCreateInput],
	{
		/**
		 * List attachments by query, filtering by linked entity IDs.
		 */
		listByQuery(query: {
			invoiceId?: string;
			expenseId?: string;
			inventoryId?: string;
			skip?: number;
			limit?: number;
			cursor?: string;
		}): Promise<AttachmentEntity[]>;
		/**
		 * Delete all orphaned attachments (not linked to any entity).
		 * Returns the number of deleted attachments.
		 */
		deleteOrphaned(): Promise<number>;
	}
>;

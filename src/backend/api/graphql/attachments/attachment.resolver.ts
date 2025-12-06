import { Arg, Authorized, Int, Mutation, Query, Resolver } from 'type-graphql';
import { ATTACHMENT_REPOSITORY } from '@/backend/repositories/attachment/di-tokens';
import type { AttachmentRepository } from '@/backend/repositories/attachment/interface';
import type { FileStorageService } from '@/backend/services/file-storage.service';
import { FILE_STORAGE_SERVICE } from '@/backend/services/file-storage.service';
import { Inject, Service } from '@/common/di';
import { GRAPHQL_TEST_SET } from '../di-tokens';
import {
	Attachment,
	AttachmentDownloadUrlResult,
	ListAttachmentsInput,
	RequestAttachmentUploadUrlResult,
} from './attachment.schema';

/**
 * GraphQL resolver for managing file attachments, including upload, confirmation, listing, deletion, and download URL generation.
 *
 * This resolver uses dependency injection for the repository and S3 service.
 */
@Service({
	addToTestSet: [GRAPHQL_TEST_SET],
})
@Resolver(() => Attachment)
export class AttachmentResolver {
	constructor(
		@Inject(ATTACHMENT_REPOSITORY) private repository: AttachmentRepository,
		@Inject(FILE_STORAGE_SERVICE) private fileStorage: FileStorageService,
	) {}

	/**
	 * Request a signed S3 upload URL for a new attachment.
	 */
	@Authorized()
	@Mutation(() => RequestAttachmentUploadUrlResult)
	async requestUpload(
		@Arg('fileName', () => String) fileName: string,
		@Arg('mimeType', () => String) mimeType: string,
		@Arg('size', () => Int) size: number,
	): Promise<RequestAttachmentUploadUrlResult> {
		// Create a new attachment entity in DB (status: 'pending')
		const bucket = process.env.BUCKETS_FILE_SST || '';
		const extension = fileName.split('.').pop();
		const nameHash = crypto.randomUUID();
		const s3Key = `attachments/${Date.now()}-${nameHash}.${extension}`;
		const attachment = await this.repository.create({
			fileName,
			mimeType,
			size,
			s3Key,
			s3Bucket: bucket,
		});
		attachment.status = 'pending';
		await this.repository.save(attachment);
		const uploadUrl = await this.fileStorage.getUploadUrl(attachment);
		return { uploadUrl, attachmentId: attachment.id };
	}

	/**
	 * Confirm that the upload has finished and mark the attachment as 'finished'.
	 */
	@Authorized()
	@Mutation(() => Attachment)
	async confirmUpload(
		@Arg('attachmentId', () => String) attachmentId: string,
	): Promise<Attachment> {
		const attachment = await this.repository.getById(attachmentId);
		if (!attachment) {
			throw new Error('Attachment not found');
		}
		attachment.status = 'finished';
		await this.repository.save(attachment);
		return attachment as Attachment;
	}

	/**
	 * Confirm that the upload has finished and mark the attachment as 'finished'.
	 */
	@Authorized()
	@Mutation(() => Attachment)
	async attachUpload(
		@Arg('attachmentId', () => String) attachmentId: string,
		@Arg('invoiceId', () => String, { nullable: true }) invoiceId?: string,
		@Arg('expenseId', () => String, { nullable: true }) expenseId?: string,
		@Arg('inventoryId', () => String, { nullable: true }) inventoryId?: string,
	): Promise<Attachment> {
		const attachment = await this.repository.getById(attachmentId);
		if (!attachment) {
			throw new Error('Attachment not found');
		}
		if (invoiceId) {
			attachment.setInvoiceId(invoiceId);
		}
		if (expenseId) {
			attachment.addExpenseId(expenseId);
		}
		if (inventoryId) {
			attachment.setInventoryId(inventoryId);
		}
		attachment.status = 'attached';
		await this.repository.save(attachment);
		return attachment as Attachment;
	}

	/**
	 * List attachments for a given entity (invoice, expense, or inventory).
	 */
	@Authorized()
	@Query(() => [Attachment])
	async attachments(
		@Arg('input', () => ListAttachmentsInput, { nullable: true })
		input?: ListAttachmentsInput,
	): Promise<Attachment[]> {
		return this.repository.listByQuery({
			invoiceId: input?.invoiceId,
			expenseId: input?.expenseId,
			inventoryId: input?.inventoryId,
			skip: input?.skip,
			limit: input?.limit,
		});
	}

	/**
	 * Get a signed S3 download URL for an attachment.
	 */
	@Authorized()
	@Query(() => AttachmentDownloadUrlResult)
	async attachment(
		@Arg('attachmentId', () => String) attachmentId: string,
	): Promise<AttachmentDownloadUrlResult> {
		const attachment = await this.repository.getById(attachmentId);
		if (!attachment) {
			throw new Error('Attachment not found');
		}
		const downloadUrl = await this.fileStorage.getDownloadUrl(attachment);
		return { downloadUrl };
	}

	/**
	 * Delete an attachment by ID (removes from DB, but S3 deletion must be handled elsewhere if needed).
	 */
	@Authorized()
	@Mutation(() => Boolean)
	async deleteAttachment(
		@Arg('attachmentId', () => String) attachmentId: string,
	): Promise<boolean> {
		const attachment = await this.repository.getById(attachmentId);
		if (!attachment) {
			return false;
		}
		await this.fileStorage.deleteFile(attachment.s3Key, {
			bucket: attachment.s3Bucket,
		});
		await this.repository.delete(attachmentId);
		return true;
	}
}

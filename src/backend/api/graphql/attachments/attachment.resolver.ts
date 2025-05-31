import { Resolver, Query, Mutation, Arg, Authorized } from 'type-graphql';

import {
	Attachment,
	RequestAttachmentUploadUrlInput,
	RequestAttachmentUploadUrlResult,
	AttachmentDownloadUrlResult,
	ListAttachmentsInput,
} from './attachment.schema';

import { Inject, Service } from '@/common/di';
import { ATTACHMENT_REPOSITORY } from '@/backend/repositories/attachment/di-tokens';
import { type AttachmentRepository } from '@/backend/repositories/attachment/interface';
import { S3Service } from '@/backend/services/s3.service';
import { AttachmentEntity } from '@/backend/entities/attachment.entity';

/**
 * GraphQL resolver for managing file attachments, including upload, confirmation, listing, deletion, and download URL generation.
 *
 * This resolver uses dependency injection for the repository and S3 service.
 *
 * TODO: Implement presigned PUT upload URL in S3Service for direct client uploads.
 */
@Service()
@Resolver(() => Attachment)
export class AttachmentResolver {
	constructor(
		@Inject(ATTACHMENT_REPOSITORY) private repository: AttachmentRepository,
		@Inject(S3Service) private s3: S3Service,
	) {}

	/**
	 * Request a signed S3 upload URL for a new attachment.
	 */
	@Authorized()
	@Mutation(() => RequestAttachmentUploadUrlResult)
	async requestUpload(
		@Arg('input') input: RequestAttachmentUploadUrlInput,
	): Promise<RequestAttachmentUploadUrlResult> {
		// Create a new attachment entity in DB (status: 'pending')
		const bucket = this.s3['configuration'].buckets.files;
		const s3Key = `attachments/${Date.now()}-${input.fileName}`;
		const attachment = new AttachmentEntity({
			fileName: input.fileName,
			mimeType: input.mimeType,
			size: input.size,
			status: 'pending',
			invoiceId: input.invoiceId,
			expenseId: input.expenseId,
			inventoryId: input.inventoryId,
			s3Key,
			s3Bucket: bucket,
		});
		await this.repository.save(attachment);
		const uploadUrl = await this.s3.getSignedUploadUrl({
			key: s3Key,
			bucket: bucket,
		});
		return { uploadUrl, attachmentId: attachment.id };
	}

	/**
	 * Confirm that the upload has finished and mark the attachment as 'finished'.
	 */
	@Authorized()
	@Mutation(() => Attachment)
	async confirmUpload(
		@Arg('attachmentId') attachmentId: string,
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
		@Arg('attachmentId') attachmentId: string,
		@Arg('invoiceId', { nullable: true }) invoiceId?: string,
		@Arg('expenseId', { nullable: true }) expenseId?: string,
		@Arg('inventoryId', { nullable: true }) inventoryId?: string,
	): Promise<Attachment> {
		const attachment = await this.repository.getById(attachmentId);
		if (!attachment) {
			throw new Error('Attachment not found');
		}
		if (invoiceId) {
			attachment.invoiceId = invoiceId;
		}
		if (expenseId) {
			attachment.expenseId = expenseId;
		}
		if (inventoryId) {
			attachment.inventoryId = inventoryId;
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
		@Arg('input', { nullable: true }) input?: ListAttachmentsInput,
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
		@Arg('attachmentId') attachmentId: string,
	): Promise<AttachmentDownloadUrlResult> {
		const attachment = await this.repository.getById(attachmentId);
		if (!attachment) {
			throw new Error('Attachment not found');
		}
		// Use S3Service.getSignedUrl for download
		const downloadUrl = await this.s3.getSignedUrl({
			key: attachment.s3Key,
			bucket: attachment.s3Bucket,
		});
		return { downloadUrl };
	}

	/**
	 * Delete an attachment by ID (removes from DB, but S3 deletion must be handled elsewhere if needed).
	 */
	@Authorized()
	@Mutation(() => Boolean)
	async deleteAttachment(
		@Arg('attachmentId') attachmentId: string,
	): Promise<boolean> {
		const attachment = await this.repository.getById(attachmentId);
		if (!attachment) {
			return false;
		}
		await this.s3.deleteObject({
			key: attachment.s3Key,
			bucket: attachment.s3Bucket,
		});
		await this.repository.delete(attachmentId);
		return true;
	}
}

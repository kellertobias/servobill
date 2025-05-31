import { Field, ObjectType, InputType, ID, Int } from 'type-graphql';

/**
 * GraphQL type representing an uploaded file attachment.
 */
@ObjectType()
export class Attachment {
	@Field(() => ID)
	id!: string;

	@Field()
	fileName!: string;

	@Field()
	mimeType!: string;

	@Field(() => Int)
	size!: number;

	@Field()
	s3Key!: string;

	@Field()
	s3Bucket!: string;

	@Field()
	status!: string;

	@Field({ nullable: true })
	invoiceId?: string;

	@Field({ nullable: true })
	expenseId?: string;

	@Field({ nullable: true })
	inventoryId?: string;

	@Field()
	createdAt!: Date;

	@Field()
	updatedAt!: Date;
}

/**
 * Input for requesting an upload signed URL.
 */
@InputType()
export class RequestAttachmentUploadUrlInput {
	@Field()
	fileName!: string;

	@Field()
	mimeType!: string;

	@Field(() => Int)
	size!: number;

	@Field({ nullable: true })
	invoiceId?: string;

	@Field({ nullable: true })
	expenseId?: string;

	@Field({ nullable: true })
	inventoryId?: string;
}

/**
 * Output for requesting an upload signed URL.
 */
@ObjectType()
export class RequestAttachmentUploadUrlResult {
	@Field()
	uploadUrl!: string;

	@Field(() => ID)
	attachmentId!: string;
}

/**
 * Output for getting a signed download URL.
 */
@ObjectType()
export class AttachmentDownloadUrlResult {
	@Field()
	downloadUrl!: string;
}

/**
 * Input for listing attachments by entity.
 */
@InputType()
export class ListAttachmentsInput {
	@Field({ nullable: true })
	invoiceId?: string;

	@Field({ nullable: true })
	expenseId?: string;

	@Field({ nullable: true })
	inventoryId?: string;

	@Field(() => Int, { nullable: true })
	skip?: number;

	@Field(() => Int, { nullable: true })
	limit?: number;
}

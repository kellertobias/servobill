import { Field, ObjectType, InputType, ID, Int } from 'type-graphql';

/**
 * GraphQL type representing an uploaded file attachment.
 */
@ObjectType()
export class Attachment {
	@Field(() => ID)
	id!: string;

	@Field(() => String)
	fileName!: string;

	@Field(() => String)
	mimeType!: string;

	@Field(() => Int)
	size!: number;

	@Field(() => String)
	s3Key!: string;

	@Field(() => String)
	s3Bucket!: string;

	@Field(() => String)
	status!: string;

	@Field(() => String, { nullable: true })
	invoiceId?: string;

	@Field(() => String, { nullable: true })
	expenseId?: string;

	@Field(() => String, { nullable: true })
	inventoryId?: string;

	@Field(() => Date)
	createdAt!: Date;

	@Field(() => Date)
	updatedAt!: Date;
}

/**
 * Output for requesting an upload signed URL.
 */
@ObjectType()
export class RequestAttachmentUploadUrlResult {
	@Field(() => String)
	uploadUrl!: string;

	@Field(() => String)
	attachmentId!: string;
}

/**
 * Output for getting a signed download URL.
 */
@ObjectType()
export class AttachmentDownloadUrlResult {
	@Field(() => String)
	downloadUrl!: string;
}

/**
 * Input for listing attachments by entity.
 */
@InputType()
export class ListAttachmentsInput {
	@Field(() => String, { nullable: true })
	invoiceId?: string;

	@Field(() => String, { nullable: true })
	expenseId?: string;

	@Field(() => String, { nullable: true })
	inventoryId?: string;

	@Field(() => Int, { nullable: true })
	skip?: number;

	@Field(() => Int, { nullable: true })
	limit?: number;
}

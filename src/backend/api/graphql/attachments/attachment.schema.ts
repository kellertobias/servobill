import { IsInt, IsOptional, IsUUID } from 'class-validator';
import { Field, ID, InputType, Int, ObjectType } from 'type-graphql';

/**
 * GraphQL type representing an uploaded file attachment.
 */
@ObjectType('Attachment')
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
@ObjectType('RequestAttachmentUploadUrlResult')
export class RequestAttachmentUploadUrlResult {
  @Field(() => String)
  uploadUrl!: string;

  @Field(() => String)
  attachmentId!: string;
}

/**
 * Output for getting a signed download URL.
 */
@ObjectType('AttachmentDownloadUrlResult')
export class AttachmentDownloadUrlResult {
  @Field(() => String)
  downloadUrl!: string;
}

/**
 * Input for listing attachments by entity.
 */
@InputType('ListAttachmentsInput')
export class ListAttachmentsInput {
  @Field(() => String, { nullable: true })
  @IsUUID()
  @IsOptional()
  invoiceId?: string;

  @Field(() => String, { nullable: true })
  @IsUUID()
  @IsOptional()
  expenseId?: string;

  @Field(() => String, { nullable: true })
  @IsUUID()
  @IsOptional()
  inventoryId?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  skip?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  limit?: number;
}

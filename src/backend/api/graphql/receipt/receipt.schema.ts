import { Field, ObjectType, InputType } from 'type-graphql';

/**
 * Input for extracting receipt data from text or attachment
 */
@InputType('ExtractReceiptInput')
export class ExtractReceiptInput {
	@Field(() => String, { nullable: true })
	text?: string;

	@Field(() => String, { nullable: true })
	attachmentId?: string;
}

/**
 * Result of receipt extraction event
 */
@ObjectType('ExtractReceiptResult')
export class ExtractReceiptResult {
	@Field(() => String)
	eventId!: string;

	@Field(() => String)
	message!: string;
}

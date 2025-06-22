import { Field, InputType } from 'type-graphql';

@InputType('ExtractReceiptInput')
export class ExtractReceiptInput {
	@Field(() => [String], {
		nullable: true,
		description: 'An array of attachment IDs to process.',
	})
	attachmentIds?: string[];

	@Field(() => String, {
		nullable: true,
		description: 'Text content to process (e.g., from an email).',
	})
	text?: string;
}

import { Field, ObjectType } from 'type-graphql';

/**
 * Result of receipt extraction event
 */
@ObjectType('ExtractReceiptResult')
export class ExtractReceiptResult {
	@Field(() => [String])
	eventIds!: string[];

	@Field(() => String)
	message!: string;
}

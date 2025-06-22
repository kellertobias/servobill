import { IsArray, IsString } from 'class-validator';
import { Field, ObjectType } from 'type-graphql';

/**
 * Result of receipt extraction event
 */
@ObjectType('ExtractReceiptResult')
export class ExtractReceiptResult {
	@Field(() => [String])
	@IsArray()
	eventIds!: string[];

	@Field(() => String)
	@IsString()
	message!: string;
}

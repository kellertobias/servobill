import { Field, ObjectType } from 'type-graphql';

@ObjectType('AuthCheckResult')
export class AuthCheckResult {
	@Field(() => Boolean)
	authenticated!: boolean;

	@Field(() => String, { nullable: true })
	userName?: string;

	@Field(() => String, { nullable: true })
	profilePictureUrl?: string;

	@Field(() => Boolean)
	refreshable!: boolean;
}

@ObjectType('GetContextResult')
export class GetContextResult {
	@Field(() => String)
	contextString!: string;
}

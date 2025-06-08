import { Field, ObjectType } from 'type-graphql';

@ObjectType()
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

@ObjectType()
export class GetContextResult {
	@Field(() => String)
	contextString!: string;
}

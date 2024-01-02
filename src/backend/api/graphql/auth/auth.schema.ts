import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class AuthCheckResult {
	@Field()
	authenticated!: boolean;

	@Field({ nullable: true })
	userName?: string;

	@Field({ nullable: true })
	profilePictureUrl?: string;

	@Field()
	refreshable!: boolean;
}

@ObjectType()
export class GetContextResult {
	@Field()
	contextString!: string;
}

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

	@Field(() => String, { nullable: true })
	email?: string;

	@Field(() => Boolean)
	isAdmin!: boolean;
}

@ObjectType('AuthProvider')
export class AuthProvider {
	@Field(() => String)
	id!: string;

	@Field(() => String)
	name!: string;

	@Field(() => String, { description: 'Path that starts the sign in' })
	loginPath!: string;
}

@ObjectType('AuthOptions')
export class AuthOptions {
	@Field(() => Boolean, { description: 'Email and password sign in' })
	localEnabled!: boolean;

	@Field(() => [AuthProvider])
	providers!: AuthProvider[];
}

@ObjectType('GetContextResult')
export class GetContextResult {
	@Field(() => String)
	contextString!: string;
}

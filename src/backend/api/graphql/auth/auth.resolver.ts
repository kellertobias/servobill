import { Query, Resolver, Ctx, Authorized } from 'type-graphql';

import { GqlContext } from '../types';

import { AuthCheckResult, GetContextResult } from './auth.schema';

import { Service } from '@/common/di';

@Service()
@Resolver()
export class AuthResolver {
	constructor() {}

	@Query(() => AuthCheckResult)
	async loggedInUser(@Ctx() context: GqlContext): Promise<AuthCheckResult> {
		return {
			authenticated: !!context.session?.user,
			userName: context.session?.user?.name || '',
			profilePictureUrl: context.session?.user?.picture || '',
			refreshable: context.session?.refreshable || false,
		};
	}

	@Authorized()
	@Query(() => GetContextResult)
	async getContext(@Ctx() context: GqlContext): Promise<GetContextResult> {
		return {
			contextString: JSON.stringify(context),
		};
	}
}

import { Query, Resolver, Ctx, Authorized } from 'type-graphql';

import { GqlContext } from '../types';

import { AuthCheckResult, GetContextResult } from './auth.schema';

import { Inject, Service } from '@/common/di';
import {
	FILE_STORAGE_SERVICE,
	type FileStorageService,
} from '@/backend/services/file-storage.service';

@Service()
@Resolver()
export class AuthResolver {
	constructor(
		@Inject(FILE_STORAGE_SERVICE)
		private fileStorageService: FileStorageService,
	) {}

	private async getUserPictureUrl(context: GqlContext): Promise<string | null> {
		const getFileArgs = this.fileStorageService.getFileDescriptor(
			context.session?.user?.picture || '',
		);
		console.log('getUserPictureUrl', {
			source: context.session?.user?.picture,
			...getFileArgs,
		});
		if (!getFileArgs) {
			return null;
		}
		return this.fileStorageService.getDownloadUrl(getFileArgs);
	}

	@Query(() => AuthCheckResult)
	async loggedInUser(@Ctx() context: GqlContext): Promise<AuthCheckResult> {
		const profilePictureSignedUrl = await this.getUserPictureUrl(context);

		return {
			authenticated: !!context.session?.user,
			userName: context.session?.user?.name || '',
			profilePictureUrl: profilePictureSignedUrl || '',
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

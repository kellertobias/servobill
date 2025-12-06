import { Authorized, Ctx, Query, Resolver } from 'type-graphql';
import {
  FILE_STORAGE_SERVICE,
  type FileStorageService,
} from '@/backend/services/file-storage.service';
import { Inject, Service } from '@/common/di';
import { AllowUnauthorized } from '@/common/graphql-decorators';
import { GRAPHQL_TEST_SET } from '../di-tokens';
import type { GqlContext } from '../types';
import { AuthCheckResult, GetContextResult } from './auth.schema';

@Service({
  addToTestSet: [GRAPHQL_TEST_SET],
})
@Resolver()
export class AuthResolver {
  constructor(
    @Inject(FILE_STORAGE_SERVICE)
    private fileStorageService: FileStorageService
  ) {}

  private async getUserPictureUrl(context: GqlContext): Promise<string | null> {
    const getFileArgs = this.fileStorageService.getFileDescriptor(
      context.session?.user?.picture || ''
    );
    if (!getFileArgs) {
      return null;
    }
    return this.fileStorageService.getDownloadUrl(getFileArgs);
  }

  @AllowUnauthorized()
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

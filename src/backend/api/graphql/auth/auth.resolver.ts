import { Authorized, Ctx, Query, Resolver } from 'type-graphql';
import {
  FILE_STORAGE_SERVICE,
  type FileStorageService,
} from '@/backend/services/file-storage.service';
import { Inject, Service } from '@/common/di';
import { AllowUnauthorized } from '@/common/graphql-decorators';
import { UserDirectoryService } from '@/backend/services/user-directory.service';
import { GRAPHQL_TEST_SET } from '../di-tokens';
import type { GqlContext } from '../types';
import { UserRole } from '@/backend/entities/user.entity';
import { GOOGLE_PROVIDER_ID, getAuthConfig } from '../../auth/config';
import { AuthCheckResult, AuthOptions, GetContextResult } from './auth.schema';

@Service({
  addToTestSet: [GRAPHQL_TEST_SET],
})
@Resolver()
export class AuthResolver {
  constructor(
    @Inject(FILE_STORAGE_SERVICE)
    private fileStorageService: FileStorageService,
    @Inject(UserDirectoryService)
    private userDirectory: UserDirectoryService
  ) {}

  /**
   * The picture is read from the user, not from the session token, so a new
   * or removed picture shows up without signing in again.
   */
  private async getStoredPicture(context: GqlContext): Promise<string> {
    const userId = context.session?.user?.userId;
    if (userId) {
      const user = await this.userDirectory.getUser(userId);
      if (user) {
        return user.profilePictureUrl || '';
      }
    }
    return context.session?.user?.picture || '';
  }

  private async getUserPictureUrl(context: GqlContext): Promise<string | null> {
    const stored = await this.getStoredPicture(context);
    if (!stored) {
      return null;
    }
    const getFileArgs = this.fileStorageService.getFileDescriptor(stored);
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
      email: context.session?.user?.email || '',
      isAdmin: (context.session?.user?.roles || []).includes(UserRole.ADMIN),
    };
  }

  @AllowUnauthorized()
  @Query(() => AuthOptions)
  authOptions(): AuthOptions {
    const config = getAuthConfig();
    return {
      localEnabled: config.localEnabled,
      providers: [
        ...(config.google
          ? [{ id: GOOGLE_PROVIDER_ID, name: 'Google', loginPath: '/api/auth/authorize' }]
          : []),
        ...config.oidcProviders.map((provider) => ({
          id: provider.id,
          name: provider.name,
          loginPath: `/api/auth/authorize?provider=${encodeURIComponent(provider.id)}`,
        })),
      ],
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

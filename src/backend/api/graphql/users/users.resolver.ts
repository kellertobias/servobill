import {
	Arg,
	Authorized,
	Ctx,
	FieldResolver,
	Mutation,
	Query,
	Resolver,
	Root,
} from 'type-graphql';
import { type UserEntity, UserRole } from '@/backend/entities/user.entity';
import {
	ProfilePictureError,
	ProfilePictureService,
} from '@/backend/services/profile-picture.service';
import {
	UserDirectoryError,
	UserDirectoryService,
} from '@/backend/services/user-directory.service';
import { Inject, Service } from '@/common/di';
import { GRAPHQL_TEST_SET } from '../di-tokens';
import type { GqlContext } from '../types';
import { User, UserCreateInput, UserUpdateInput } from './users.schema';

export const toGqlUser = (user: UserEntity): User => ({
	id: user.id,
	email: user.email,
	name: user.name,
	role: user.role,
	disabled: user.disabled,
	hasPassword: user.hasPassword,
	identityProviders: [
		...new Set(user.identities.map((identity) => identity.provider)),
	],
	storedProfilePictureUrl: user.profilePictureUrl,
	lastLoginAt: user.lastLoginAt,
	createdAt: user.createdAt,
	updatedAt: user.updatedAt,
});

const requireUserId = (context: GqlContext): string => {
	const userId = context.session?.user?.userId;
	if (!userId) {
		throw new Error('Not authenticated');
	}
	return userId;
};

/** Rethrows business rule violations as plain GraphQL errors. */
const run = async <T>(action: () => Promise<T>): Promise<T> => {
	try {
		return await action();
	} catch (error) {
		if (
			error instanceof UserDirectoryError ||
			error instanceof ProfilePictureError
		) {
			throw new Error(error.message);
		}
		throw error;
	}
};

@Service({
	addToTestSet: [GRAPHQL_TEST_SET],
})
@Resolver(() => User)
export class UserResolver {
	constructor(
		@Inject(UserDirectoryService) private userDirectory: UserDirectoryService,
		@Inject(ProfilePictureService)
		private profilePictures: ProfilePictureService,
	) {}

	@Authorized(UserRole.ADMIN)
	@Query(() => [User])
	async users(): Promise<User[]> {
		const users = await this.userDirectory.listUsers();
		return users.map(toGqlUser);
	}

	@Authorized(UserRole.ADMIN)
	@Query(() => User, { nullable: true })
	async user(@Arg('id', () => String) id: string): Promise<User | null> {
		const user = await this.userDirectory.getUser(id);
		return user ? toGqlUser(user) : null;
	}

	@Authorized()
	@Query(() => User, { nullable: true, description: 'The signed in user' })
	async me(@Ctx() context: GqlContext): Promise<User | null> {
		const user = await this.userDirectory.getUser(requireUserId(context));
		return user ? toGqlUser(user) : null;
	}

	@Authorized(UserRole.ADMIN)
	@Mutation(() => User)
	async createUser(
		@Arg('data', () => UserCreateInput) data: UserCreateInput,
	): Promise<User> {
		return run(async () =>
			toGqlUser(await this.userDirectory.createUser(data)),
		);
	}

	@Authorized(UserRole.ADMIN)
	@Mutation(() => User)
	async updateUser(
		@Arg('id', () => String) id: string,
		@Arg('data', () => UserUpdateInput) data: UserUpdateInput,
		@Ctx() context: GqlContext,
	): Promise<User> {
		return run(async () =>
			toGqlUser(
				await this.userDirectory.updateUser(id, data, requireUserId(context)),
			),
		);
	}

	@Authorized(UserRole.ADMIN)
	@Mutation(() => Boolean)
	async deleteUser(
		@Arg('id', () => String) id: string,
		@Ctx() context: GqlContext,
	): Promise<boolean> {
		return run(async () => {
			await this.userDirectory.deleteUser(id, requireUserId(context));
			return true;
		});
	}

	@Authorized(UserRole.ADMIN)
	@Mutation(() => User, {
		description: 'Set a new password or remove it (null)',
	})
	async setUserPassword(
		@Arg('id', () => String) id: string,
		@Arg('password', () => String, { nullable: true }) password: string | null,
	): Promise<User> {
		return run(async () =>
			toGqlUser(await this.userDirectory.setPassword(id, password || null)),
		);
	}

	@Authorized()
	@Mutation(() => Boolean)
	async changeOwnPassword(
		@Arg('currentPassword', () => String, { nullable: true }) currentPassword:
			| string
			| null,
		@Arg('newPassword', () => String) newPassword: string,
		@Ctx() context: GqlContext,
	): Promise<boolean> {
		return run(async () => {
			await this.userDirectory.changeOwnPassword(
				requireUserId(context),
				currentPassword || '',
				newPassword,
			);
			return true;
		});
	}
	@FieldResolver(() => String, { nullable: true })
	async profilePictureUrl(@Root() user: User): Promise<string | null> {
		return this.profilePictures.getDisplayUrl(user.storedProfilePictureUrl);
	}

	@Authorized()
	@Mutation(() => User, {
		description:
			'Set the own profile picture: a 512x512 JPEG as base64 or data URL',
	})
	async setOwnProfilePicture(
		@Arg('image', () => String) image: string,
		@Ctx() context: GqlContext,
	): Promise<User> {
		return run(async () =>
			toGqlUser(
				await this.profilePictures.upload(requireUserId(context), image),
			),
		);
	}

	@Authorized()
	@Mutation(() => User)
	async removeOwnProfilePicture(@Ctx() context: GqlContext): Promise<User> {
		return run(async () =>
			toGqlUser(await this.profilePictures.remove(requireUserId(context))),
		);
	}
}

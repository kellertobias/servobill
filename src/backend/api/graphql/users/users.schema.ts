import {
	IsBoolean,
	IsEmail,
	IsEnum,
	IsOptional,
	IsString,
	MaxLength,
} from 'class-validator';
import { Field, ID, InputType, ObjectType } from 'type-graphql';
import { UserRole } from '@/backend/entities/user.entity';

@ObjectType('User')
export class User {
	@Field(() => ID)
	id!: string;

	@Field(() => String)
	email!: string;

	@Field(() => String)
	name!: string;

	@Field(() => UserRole)
	role!: UserRole;

	@Field(() => Boolean)
	disabled!: boolean;

	@Field(() => Boolean)
	hasPassword!: boolean;

	@Field(() => [String], {
		description: 'Ids of the sign in providers linked to this user',
	})
	identityProviders!: string[];

	@Field(() => Date, { nullable: true })
	lastLoginAt?: Date;

	@Field(() => Date)
	createdAt!: Date;

	@Field(() => Date)
	updatedAt!: Date;
}

@InputType('UserCreateInput')
export class UserCreateInput {
	@Field(() => String)
	@IsEmail()
	email!: string;

	@Field(() => String)
	@IsString()
	@MaxLength(200)
	name!: string;

	@Field(() => UserRole, { nullable: true })
	@IsOptional()
	@IsEnum(UserRole)
	role?: UserRole;

	@IsOptional()
	@IsString()
	@Field(() => String, {
		nullable: true,
		description: 'Initial password (requires LOCAL_AUTH_ENABLED)',
	})
	password?: string;
}

@InputType('UserUpdateInput')
export class UserUpdateInput {
	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsEmail()
	email?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	@MaxLength(200)
	name?: string;

	@Field(() => UserRole, { nullable: true })
	@IsOptional()
	@IsEnum(UserRole)
	role?: UserRole;

	@Field(() => Boolean, { nullable: true })
	@IsOptional()
	@IsBoolean()
	disabled?: boolean;
}

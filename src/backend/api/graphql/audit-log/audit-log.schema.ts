import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Field, ID, InputType, Int, ObjectType } from 'type-graphql';

@ObjectType('AuditLogEntry')
export class AuditLogEntry {
	@Field(() => ID)
	id!: string;

	@Field(() => Date)
	createdAt!: Date;

	@Field(() => String, { nullable: true })
	actorId?: string;

	@Field(() => String, { nullable: true })
	actorEmail?: string;

	@Field(() => String, { nullable: true })
	actorName?: string;

	@Field(() => String, {
		description: 'The action, e.g. a mutation name or auth.login',
	})
	action!: string;

	@Field(() => String, { nullable: true })
	entityType?: string;

	@Field(() => String, { nullable: true })
	entityId?: string;

	@Field(() => Boolean)
	success!: boolean;

	@Field(() => String, {
		description: 'JSON encoded, sanitized details (arguments, errors)',
	})
	details!: string;

	@Field(() => String, { nullable: true })
	ipAddress?: string;
}

@ObjectType('AuditLogPage')
export class AuditLogPage {
	@Field(() => [AuditLogEntry])
	entries!: AuditLogEntry[];

	@Field(() => String, {
		nullable: true,
		description: 'Pass as cursor to load older entries',
	})
	nextCursor?: string;
}

@InputType('AuditLogFilter')
export class AuditLogFilter {
	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	actorId?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	entityType?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	cursor?: string;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(200)
	limit?: number;
}

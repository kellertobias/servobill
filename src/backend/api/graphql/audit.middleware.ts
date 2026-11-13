import type { MiddlewareInterface, NextFn, ResolverData } from 'type-graphql';
import { AuditLogService } from '@/backend/services/audit-log.service';
import { Inject, Service } from '@/common/di';
import { GRAPHQL_TEST_SET } from './di-tokens';
import type { GqlContext } from './types';

type NamedTypeLike = { name?: string; ofType?: unknown; getFields?: unknown };

/**
 * Name of the object type a field returns (unwrapping lists and non-null),
 * or undefined for scalars. Avoids graphql's instanceof based helpers, which
 * break when more than one copy of graphql is loaded.
 */
const objectTypeName = (type: unknown): string | undefined => {
	let current = type as NamedTypeLike | undefined;
	while (current?.ofType) {
		current = current.ofType as NamedTypeLike;
	}
	return typeof current?.getFields === 'function' ? current.name : undefined;
};

const idOf = (value: unknown): string | undefined => {
	if (typeof value === 'string' && value.length <= 100) {
		return value;
	}
	if (value && typeof value === 'object' && 'id' in value) {
		const id = (value as { id?: unknown }).id;
		return typeof id === 'string' ? id : undefined;
	}
	return undefined;
};

/**
 * Records every GraphQL mutation in the audit log: who called it, the
 * sanitized arguments, the affected object and whether it succeeded.
 * Queries are not recorded.
 */
@Service({ addToTestSet: [GRAPHQL_TEST_SET] })
export class AuditMiddleware implements MiddlewareInterface<GqlContext> {
	constructor(@Inject(AuditLogService) private auditLog: AuditLogService) {}

	async use(
		{ args, context, info }: ResolverData<GqlContext>,
		next: NextFn,
	): Promise<unknown> {
		if (info.parentType.name !== 'Mutation') {
			return next();
		}

		const user = context.session?.user;
		const base = {
			action: info.fieldName,
			entityType: objectTypeName(info.returnType),
			actor: user
				? { userId: user.userId, email: user.email, name: user.name }
				: undefined,
			ipAddress: context.http?.sourceIp,
		};

		try {
			const result = await next();
			await this.auditLog.record({
				...base,
				entityId: idOf(args.id) ?? idOf(result),
				success: true,
				details: { args },
			});
			return result;
		} catch (error) {
			await this.auditLog.record({
				...base,
				entityId: idOf(args.id),
				success: false,
				details: {
					args,
					error: error instanceof Error ? error.message : String(error),
				},
			});
			throw error;
		}
	}
}

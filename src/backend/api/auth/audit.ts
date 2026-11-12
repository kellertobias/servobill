import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import type { UserEntity } from '@/backend/entities/user.entity';
import { AuditLogService } from '@/backend/services/audit-log.service';
import { DefaultContainer } from '@/common/di';

/** Sign in method derived from the auth route that handled the request. */
const methodOf = (evt: APIGatewayProxyEventV2): string => {
	switch (evt.pathParameters?.action) {
		case 'callback': {
			return 'google';
		}
		case 'oidc-callback': {
			return 'oidc';
		}
		case 'login': {
			return 'password';
		}
		default: {
			return evt.pathParameters?.action || 'unknown';
		}
	}
};

/**
 * Records a sign in related event (auth.login, auth.login_failed,
 * auth.login_locked, auth.logout) in the audit log.
 */
export const auditAuthEvent = async (
	evt: APIGatewayProxyEventV2,
	event: {
		action: string;
		success: boolean;
		user?: Pick<UserEntity, 'id' | 'email' | 'name'> | null;
		email?: string;
		details?: Record<string, unknown>;
	},
): Promise<void> => {
	await DefaultContainer.get(AuditLogService).record({
		action: event.action,
		success: event.success,
		entityType: 'User',
		entityId: event.user?.id,
		actor: event.user
			? {
					userId: event.user.id,
					email: event.user.email,
					name: event.user.name,
				}
			: event.email
				? { email: event.email }
				: undefined,
		ipAddress: evt.requestContext?.http?.sourceIp,
		details: { method: methodOf(evt), ...(event.details || {}) },
	});
};

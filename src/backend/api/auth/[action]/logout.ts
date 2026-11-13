import { withSpan } from '@/backend/instrumentation';
import { DefaultContainer } from '@/common/di';
import { getSiteUrl } from '../../helpers';
import { extractToken } from '../../session';
import type { APIHandler } from '../../types';
import { auditAuthEvent } from '../audit';
import { AuthenticationService } from '../authentication';

export const logoutHandler: APIHandler = withSpan(
	{
		name: 'api.auth.logout',
	},
	async (evt) => {
		const { siteUrl } = getSiteUrl(evt);
		const auth = DefaultContainer.get(AuthenticationService);
		const session = (extractToken.session(evt) || extractToken.refresh(evt))
			?.dat;
		if (session?.userId) {
			await auditAuthEvent(evt, {
				action: 'auth.logout',
				success: true,
				user: { id: session.userId, email: session.email, name: session.name },
			});
		}

		return auth.endSession(evt, {
			forwardUrl: `${siteUrl}/login?logout`,
		});
	},
);

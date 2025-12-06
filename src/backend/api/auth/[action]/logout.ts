import { withSpan } from '@/backend/instrumentation';
import { DefaultContainer } from '@/common/di';
import { getSiteUrl } from '../../helpers';
import type { APIHandler } from '../../types';
import { AuthenticationService } from '../authentication';

export const logoutHandler: APIHandler = withSpan(
	{
		name: 'api.auth.logout',
	},
	async (evt) => {
		const { siteUrl } = getSiteUrl(evt);
		const auth = DefaultContainer.get(AuthenticationService);

		return auth.endSession(evt, {
			forwardUrl: `${siteUrl}/login?logout`,
		});
	},
);

import { getSiteUrl } from '../../helpers';
import { AuthenticationService } from '../authentication';
import { APIHandler } from '../../types';

import { DefaultContainer } from '@/common/di';
import { withSpan } from '@/backend/instrumentation';

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

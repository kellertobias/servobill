import { withSpan } from '@/backend/instrumentation';
import { DefaultContainer } from '@/common/di';
import { getSiteUrl } from '../../helpers';
import type { APIHandler } from '../../types';
import { AuthenticationService } from '../authentication';

export const tokenRenewalHandler: APIHandler = withSpan(
	{
		name: 'api.auth.renew',
	},
	async (evt) => {
		const { siteUrl } = getSiteUrl(evt);
		const auth = DefaultContainer.get(AuthenticationService);

		const isAjax = evt.headers['x-requested-with'] === 'XMLHttpRequest';

		return auth.renewSession(evt, {
			forwardUrl: isAjax ? undefined : `${siteUrl}/login?logout`,
		});
	},
);

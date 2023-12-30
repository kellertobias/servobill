import { getSiteUrl } from '../../helpers';
import { AuthenticationService } from '../authentication';
import { APIHandler } from '../../types';

import { DefaultContainer } from '@/common/di';

export const tokenRenewalHandler: APIHandler = async (evt) => {
	const { siteUrl } = getSiteUrl(evt);
	const auth = DefaultContainer.get(AuthenticationService);

	const isAjax = evt.headers['x-requested-with'] === 'XMLHttpRequest';

	return auth.renewSession(evt, {
		forwardUrl: isAjax ? undefined : `${siteUrl}/login?logout`,
	});
};

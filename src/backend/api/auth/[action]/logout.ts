import { getSiteUrl } from '../../helpers';
import { AuthenticationService } from '../authentication';
import { APIHandler } from '../../types';

import { DefaultContainer } from '@/common/di';

export const logoutHandler: APIHandler = async (evt) => {
	const { siteUrl } = getSiteUrl(evt);
	const auth = DefaultContainer.get(AuthenticationService);

	return auth.endSession(evt, {
		forwardUrl: `${siteUrl}/login?logout`,
	});
};

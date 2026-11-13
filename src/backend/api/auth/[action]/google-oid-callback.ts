import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { withSpan } from '@/backend/instrumentation';
import { Logger } from '@/backend/services/logger.service';
import { UserDirectoryService } from '@/backend/services/user-directory.service';
import { DefaultContainer } from '@/common/di';
import { getBody } from '../../helpers';
import type { APIHandler } from '../../types';
import { GOOGLE_PROVIDER_ID, getAuthConfig } from '../config';
import { finishExternalLogin, loginErrorRedirect } from './login-result';

const logger = new Logger('GoogleAuth');

const client = new OAuth2Client();
const verify = async (idToken: string, audience: string) => {
	const ticket = await client.verifyIdToken({ idToken, audience });
	return ticket.getPayload();
};

export const googleOidCallbackHandler: APIHandler = withSpan(
	{
		name: 'api.auth.google-oid-callback',
	},
	async (evt) => {
		const google = getAuthConfig().google;
		const body = getBody(evt);
		const rawToken = body?.id_token;
		if (!google || !rawToken) {
			return loginErrorRedirect(evt, 'Invalid User');
		}
		let token: TokenPayload | undefined;
		try {
			token = await verify(rawToken as string, google.clientId);
			if (!token?.sub) {
				throw new Error('Invalid Token');
			}
		} catch (error) {
			logger.warn('googleOidCallbackHandler', { error });
			return loginErrorRedirect(evt, 'Invalid User');
		}

		const user = await DefaultContainer.get(
			UserDirectoryService,
		).resolveExternalLogin({
			provider: GOOGLE_PROVIDER_ID,
			subject: token.sub,
			email: token.email,
			emailVerified: token.email_verified === true,
			name: token.name,
			autoProvision: false,
			requireVerifiedEmail: true,
		});

		if (!user) {
			return loginErrorRedirect(evt, 'Invalid User');
		}

		return finishExternalLogin(evt, user, token.picture);
	},
);

import { OAuth2Client, TokenPayload } from 'google-auth-library';

import { OAUTH_CLIENT_ID } from '../config';
import { getBody, getSiteUrl } from '../../helpers';
import { AuthenticationService } from '../authentication';
import { APIHandler } from '../../types';

import { SessionRepository } from '@/backend/repositories/session.repository';
import { DefaultContainer } from '@/common/di';
import { Logger } from '@/backend/services/logger.service';

const logger = new Logger('GoogleAuth');

const client = new OAuth2Client();
const verify = async (idToken: string) => {
	const ticket = await client.verifyIdToken({
		idToken,
		audience: OAUTH_CLIENT_ID,
	});
	const payload = ticket.getPayload();
	return payload;
};

export const googleOidCallbackHandler: APIHandler = async (evt) => {
	const auth = DefaultContainer.get(AuthenticationService);

	const body = getBody(evt);
	const { siteUrl } = getSiteUrl(evt);
	const rawToken = body?.id_token;
	if (!rawToken) {
		return auth.generateResponse({
			statusCode: 400,
			forwardUrl: `${siteUrl}/login?error=Invalid%20User`,
		});
	}
	let token: TokenPayload | undefined;
	try {
		token = await verify(body?.id_token as string);
		if (!token) {
			throw new Error('Invalid Token');
		}
	} catch (error) {
		logger.warn('googleOidCallbackHandler', { error });
		return auth.generateResponse({
			statusCode: 400,
			forwardUrl: `${siteUrl}/login?error=Invalid%20User`,
		});
	}
	const sessionUserRepo = DefaultContainer.get(SessionRepository);

	const user = await sessionUserRepo.findUserForSession({
		userId: token?.sub,
		name: token?.name,
		email: token?.email,
	});

	if (!user) {
		return auth.generateResponse({
			statusCode: 401,
			forwardUrl: `${siteUrl}/login?error=Invalid%20User`,
		});
	}

	return auth.startSession(evt, {
		user,
		forwardUrl: `${siteUrl}/login?success=true`,
	});
};

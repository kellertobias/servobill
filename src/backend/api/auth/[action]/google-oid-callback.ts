import { OAuth2Client, TokenPayload } from 'google-auth-library';

import { OAUTH_CLIENT_ID } from '../config';
import { getBody, getSiteUrl } from '../../helpers';
import { AuthenticationService } from '../authentication';
import { APIHandler } from '../../types';

import { SESSION_REPOSITORY } from '@/backend/repositories/session/di-tokens';
import { type SessionRepository } from '@/backend/repositories/session/interface';
import { DefaultContainer } from '@/common/di';
import { Logger } from '@/backend/services/logger.service';
import { S3Service } from '@/backend/services/s3.service';
import { withSpan } from '@/backend/instrumentation';

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

const getUserPicture = async (user: TokenPayload) => {
	const picture = user?.picture;
	if (!picture) {
		return null;
	}
	// Download Picture to buffer
	const res = await fetch(picture);
	const buffer = Buffer.from(await res.arrayBuffer());

	// Upload to S3, but handle errors gracefully (e.g., bucket missing)
	const s3 = DefaultContainer.get(S3Service);
	const key = `profile-pictures/${user?.sub}.png`;
	try {
		const url = await s3.putObject({
			body: buffer,
			key,
			public: true,
		});
		return url;
	} catch (error) {
		// Log the error and return null so login does not crash
		logger.warn('Failed to upload profile picture to S3', { error });
		return null;
	}
};

export const googleOidCallbackHandler: APIHandler = withSpan(
	{
		name: 'api.auth.google-oid-callback',
	},
	async (evt) => {
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
		const sessionUserRepo = DefaultContainer.get(
			SESSION_REPOSITORY,
		) as SessionRepository;

		const profilePicture = await getUserPicture(token);

		const user = await sessionUserRepo.findUserForSession({
			userId: token?.sub,
			name: token?.name,
			email: token?.email,
			profilePictureUrl: profilePicture || undefined,
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
	},
);

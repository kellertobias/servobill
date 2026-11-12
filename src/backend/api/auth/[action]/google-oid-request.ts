import querystring from 'node:querystring';

// eslint-disable-next-line import/no-extraneous-dependencies
import * as cookies from 'cookie';
import { withSpan } from '@/backend/instrumentation';
import { getSiteUrl } from '../../helpers';
import type { APIHandler } from '../../types';
import { getAuthConfig, OAUTH_ENDPOINT } from '../config';
import { loginErrorRedirect } from './login-result';

export const googleOidRequestHandler: APIHandler = withSpan(
	{
		name: 'api.auth.google-oid-request',
	},
	async (evt, ctx) => {
		const google = getAuthConfig().google;
		if (!google) {
			return loginErrorRedirect(evt, 'Google sign in is not configured');
		}
		const { url } = getSiteUrl(evt);
		const nonce = ctx.awsRequestId;

		const oauthRequest = {
			client_id: google.clientId,
			redirect_uri: `${url}/api/auth/callback`,
			response_type: 'id_token',
			response_mode: 'form_post',
			scope: 'openid email profile',
			state: 'no-state',
			nonce,
		};

		// Redirect user. 302 instead of 301 so browsers never cache the nonce.
		return {
			statusCode: 302,
			body: 'Forwarding to OAuth provider...',
			headers: {
				Location: `${OAUTH_ENDPOINT}?${querystring.stringify(oauthRequest)}`,
			},
			cookies: [
				cookies.serialize('auth-nonce', ctx.awsRequestId, {
					httpOnly: true,
					maxAge: 6000,
					sameSite: 'lax',
					secure: !url.includes('localhost'),
				}),
			],
		};
	},
);

import { withSpan } from '@/backend/instrumentation';
import { Logger } from '@/backend/services/logger.service';
import { getSiteUrl } from '../../helpers';
import type { APIHandler } from '../../types';
import { getOidcProvider } from '../config';
import { buildAuthorizationUrl, createPkcePair, randomToken } from '../oidc';
import { loginErrorRedirect } from './login-result';
import { makeStateCookie } from './oidc-state';

const logger = new Logger('OidcAuth');

export const getOidcRedirectUri = (evt: Parameters<APIHandler>[0]) =>
	`${getSiteUrl(evt).url}/api/auth/oidc-callback`;

export const oidcRequestHandler: APIHandler = withSpan(
	{
		name: 'api.auth.oidc-request',
	},
	async (evt) => {
		const providerId = evt.queryStringParameters?.provider || '';
		const provider = getOidcProvider(providerId);
		if (!provider) {
			return loginErrorRedirect(evt, 'Unknown sign in provider');
		}

		const state = randomToken();
		const nonce = randomToken();
		const pkce = createPkcePair();

		let location: string;
		try {
			location = await buildAuthorizationUrl(provider, {
				redirectUri: getOidcRedirectUri(evt),
				state,
				nonce,
				codeChallenge: pkce.challenge,
			});
		} catch (error) {
			logger.error('Could not reach OIDC provider', {
				provider: provider.id,
				error,
			});
			return loginErrorRedirect(
				evt,
				`${provider.name} is currently not reachable`,
			);
		}

		return {
			statusCode: 302,
			body: 'Forwarding to sign in provider...',
			headers: { Location: location, 'Cache-Control': 'no-store' },
			cookies: [
				makeStateCookie({
					p: provider.id,
					s: state,
					n: nonce,
					v: pkce.verifier,
				}),
			],
		};
	},
);

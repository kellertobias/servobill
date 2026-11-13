import { UserRole } from '@/backend/entities/user.entity';
import { withSpan } from '@/backend/instrumentation';
import { Logger } from '@/backend/services/logger.service';
import { UserDirectoryService } from '@/backend/services/user-directory.service';
import { DefaultContainer } from '@/common/di';
import type { APIHandler } from '../../types';
import { getOidcProvider, type OidcProviderConfig } from '../config';
import {
	exchangeCode,
	extractRoles,
	fetchUserInfo,
	isEmailVerified,
	type OidcClaims,
	verifyIdToken,
} from '../oidc';
import { finishExternalLogin, loginErrorRedirect } from './login-result';
import { getOidcRedirectUri } from './oidc-request';
import { clearStateCookie, readStateCookie } from './oidc-state';

const logger = new Logger('OidcAuth');

const getProviderRole = (
	provider: OidcProviderConfig,
	claims: Record<string, unknown>,
): UserRole | undefined => {
	if (!provider.rolesClaim || provider.adminRoles.length === 0) {
		return undefined;
	}
	const roles = extractRoles(claims, provider.rolesClaim);
	return roles.some((role) => provider.adminRoles.includes(role))
		? UserRole.ADMIN
		: UserRole.USER;
};

export const oidcCallbackHandler: APIHandler = withSpan(
	{
		name: 'api.auth.oidc-callback',
	},
	async (evt) => {
		const clear = [clearStateCookie()];
		const query = evt.queryStringParameters || {};
		const loginState = readStateCookie(evt);

		if (query.error) {
			logger.info('OIDC provider returned an error', { error: query.error });
			return loginErrorRedirect(
				evt,
				query.error_description || query.error,
				clear,
			);
		}
		if (
			!loginState ||
			!query.code ||
			!query.state ||
			query.state !== loginState.s
		) {
			return loginErrorRedirect(
				evt,
				'Sign in expired or was started in another browser. Please try again.',
				clear,
			);
		}
		const provider = getOidcProvider(loginState.p);
		if (!provider) {
			return loginErrorRedirect(evt, 'Unknown sign in provider', clear);
		}

		let claims: OidcClaims;
		try {
			const tokens = await exchangeCode(provider, {
				code: query.code,
				redirectUri: getOidcRedirectUri(evt),
				codeVerifier: loginState.v,
			});
			claims = await verifyIdToken(provider, tokens.id_token, loginState.n);
			if (tokens.access_token) {
				// Providers like Zitadel only put profile data into the userinfo
				// response unless configured otherwise.
				const userInfo = await fetchUserInfo(
					provider,
					tokens.access_token,
				).catch((error) => {
					logger.warn('Could not load userinfo', { error });
					return null;
				});
				if (userInfo && userInfo.sub === claims.sub) {
					// ID token claims win, userinfo fills the gaps.
					claims = { ...userInfo, ...claims };
				}
			}
		} catch (error) {
			logger.warn('OIDC callback failed', { provider: provider.id, error });
			return loginErrorRedirect(evt, 'Sign in failed', clear);
		}

		const user = await DefaultContainer.get(
			UserDirectoryService,
		).resolveExternalLogin({
			provider: provider.id,
			subject: claims.sub,
			email: claims.email,
			emailVerified: isEmailVerified(claims),
			name:
				claims.name ||
				[claims.given_name, claims.family_name].filter(Boolean).join(' ') ||
				claims.preferred_username,
			autoProvision: provider.autoProvision,
			requireVerifiedEmail: provider.requireVerifiedEmail,
			providerRole: getProviderRole(provider, claims),
		});

		if (!user) {
			return loginErrorRedirect(
				evt,
				'Your account is not allowed to use this application',
				clear,
			);
		}

		return finishExternalLogin(
			evt,
			user,
			typeof claims.picture === 'string' ? claims.picture : undefined,
			clear,
		);
	},
);

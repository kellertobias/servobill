import {
	createHash,
	createPublicKey,
	type JsonWebKey,
	type KeyObject,
	randomBytes,
} from 'node:crypto';
import jwt from 'jsonwebtoken';
import { UserRole } from '@/backend/entities/user.entity';
import type { OidcProviderConfig } from './config';

/**
 * Minimal OpenID Connect relying party: discovery, authorization code flow
 * with PKCE, ID token validation against the provider's JWKS and userinfo.
 *
 * Works with any compliant provider (Zitadel, Keycloak, Authentik, Google, ...)
 * and only uses Node built-ins plus `jsonwebtoken`.
 */

export type OidcDiscovery = {
	issuer: string;
	authorization_endpoint: string;
	token_endpoint: string;
	jwks_uri: string;
	userinfo_endpoint?: string;
	end_session_endpoint?: string;
};

export type OidcClaims = {
	sub: string;
	email?: string;
	email_verified?: boolean | string;
	name?: string;
	given_name?: string;
	family_name?: string;
	preferred_username?: string;
	picture?: string;
	nonce?: string;
	[claim: string]: unknown;
};

const SIGNING_ALGORITHMS: jwt.Algorithm[] = [
	'RS256',
	'RS384',
	'RS512',
	'PS256',
	'PS384',
	'PS512',
	'ES256',
	'ES384',
	'ES512',
];

const CACHE_TTL = 60 * 60 * 1000;
const discoveryCache = new Map<
	string,
	{ value: OidcDiscovery; expires: number }
>();
const jwksCache = new Map<string, { keys: JsonWebKey[]; expires: number }>();

/** Exposed for tests. */
export const clearOidcCaches = () => {
	discoveryCache.clear();
	jwksCache.clear();
};

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
	const response = await fetch(url, {
		...init,
		headers: { Accept: 'application/json', ...init?.headers },
		signal: AbortSignal.timeout(10_000),
	});
	if (!response.ok) {
		const body = await response.text().catch(() => '');
		throw new Error(
			`OIDC request to ${url} failed with ${response.status}: ${body.slice(0, 300)}`,
		);
	}
	return (await response.json()) as T;
};

const normalizeIssuer = (issuer: string) => issuer.replace(/\/+$/, '');

export const discover = async (
	provider: OidcProviderConfig,
): Promise<OidcDiscovery> => {
	const cached = discoveryCache.get(provider.issuer);
	if (cached && cached.expires > Date.now()) {
		return cached.value;
	}
	const value = await fetchJson<OidcDiscovery>(
		`${provider.issuer}/.well-known/openid-configuration`,
	);
	if (normalizeIssuer(value.issuer) !== normalizeIssuer(provider.issuer)) {
		throw new Error(
			`OIDC issuer mismatch: configured ${provider.issuer}, discovered ${value.issuer}`,
		);
	}
	for (const key of [
		'authorization_endpoint',
		'token_endpoint',
		'jwks_uri',
	] as const) {
		if (!value[key]) {
			throw new Error(`OIDC discovery for ${provider.issuer} lacks ${key}`);
		}
	}
	discoveryCache.set(provider.issuer, {
		value,
		expires: Date.now() + CACHE_TTL,
	});
	return value;
};

const base64Url = (buffer: Buffer) => buffer.toString('base64url');

export const createPkcePair = () => {
	const verifier = base64Url(randomBytes(32));
	const challenge = base64Url(createHash('sha256').update(verifier).digest());
	return { verifier, challenge };
};

export const randomToken = () => base64Url(randomBytes(24));

export const buildAuthorizationUrl = async (
	provider: OidcProviderConfig,
	params: {
		redirectUri: string;
		state: string;
		nonce: string;
		codeChallenge: string;
	},
): Promise<string> => {
	const discovery = await discover(provider);
	const url = new URL(discovery.authorization_endpoint);
	url.searchParams.set('client_id', provider.clientId);
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('scope', provider.scopes);
	url.searchParams.set('redirect_uri', params.redirectUri);
	url.searchParams.set('state', params.state);
	url.searchParams.set('nonce', params.nonce);
	url.searchParams.set('code_challenge', params.codeChallenge);
	url.searchParams.set('code_challenge_method', 'S256');
	return url.toString();
};

export const exchangeCode = async (
	provider: OidcProviderConfig,
	params: { code: string; redirectUri: string; codeVerifier: string },
): Promise<{ id_token: string; access_token?: string }> => {
	const discovery = await discover(provider);
	const body = new URLSearchParams({
		grant_type: 'authorization_code',
		code: params.code,
		redirect_uri: params.redirectUri,
		code_verifier: params.codeVerifier,
	});
	const headers: Record<string, string> = {
		'Content-Type': 'application/x-www-form-urlencoded',
	};
	if (provider.tokenAuthMethod === 'client_secret_basic') {
		const credentials = `${encodeURIComponent(provider.clientId)}:${encodeURIComponent(
			provider.clientSecret || '',
		)}`;
		headers.Authorization = `Basic ${Buffer.from(credentials).toString('base64')}`;
	} else {
		body.set('client_id', provider.clientId);
		if (provider.tokenAuthMethod === 'client_secret_post') {
			body.set('client_secret', provider.clientSecret || '');
		}
	}
	const tokens = await fetchJson<{ id_token?: string; access_token?: string }>(
		discovery.token_endpoint,
		{ method: 'POST', headers, body: body.toString() },
	);
	if (!tokens.id_token) {
		throw new Error('OIDC token response did not contain an id_token');
	}
	return { id_token: tokens.id_token, access_token: tokens.access_token };
};

const getSigningKey = async (
	jwksUri: string,
	kid: string | undefined,
): Promise<KeyObject> => {
	const load = async (force: boolean) => {
		const cached = jwksCache.get(jwksUri);
		if (!force && cached && cached.expires > Date.now()) {
			return cached.keys;
		}
		const { keys } = await fetchJson<{ keys: JsonWebKey[] }>(jwksUri);
		jwksCache.set(jwksUri, { keys, expires: Date.now() + CACHE_TTL });
		return keys;
	};
	const pick = (keys: JsonWebKey[]) =>
		keys.find(
			(key) =>
				(!kid || key.kid === kid) &&
				(key.use === undefined || key.use === 'sig') &&
				key.kty !== 'oct',
		);

	// Retry once with fresh keys to handle key rotation.
	const key = pick(await load(false)) || pick(await load(true));
	if (!key) {
		throw new Error(`No signing key found for kid "${kid}"`);
	}
	return createPublicKey({ key, format: 'jwk' });
};

export const verifyIdToken = async (
	provider: OidcProviderConfig,
	idToken: string,
	expectedNonce: string,
): Promise<OidcClaims> => {
	const discovery = await discover(provider);
	const decoded = jwt.decode(idToken, { complete: true });
	if (!decoded || typeof decoded.payload === 'string') {
		throw new Error('ID token is not a JWT');
	}
	const key = await getSigningKey(discovery.jwks_uri, decoded.header.kid);
	const claims = jwt.verify(idToken, key, {
		algorithms: SIGNING_ALGORITHMS,
		issuer: [discovery.issuer, normalizeIssuer(discovery.issuer)],
		audience: provider.clientId,
		clockTolerance: 60,
	}) as OidcClaims;

	if (!claims.sub) {
		throw new Error('ID token has no subject');
	}
	if (claims.nonce !== expectedNonce) {
		throw new Error('ID token nonce mismatch');
	}
	const audience = (claims as { aud?: string | string[] }).aud;
	const azp = (claims as { azp?: string }).azp;
	if (
		Array.isArray(audience) &&
		audience.length > 1 &&
		azp &&
		azp !== provider.clientId
	) {
		throw new Error('ID token was issued to another client (azp)');
	}
	return claims;
};

export const fetchUserInfo = async (
	provider: OidcProviderConfig,
	accessToken: string,
): Promise<Partial<OidcClaims> | null> => {
	const discovery = await discover(provider);
	if (!discovery.userinfo_endpoint) {
		return null;
	}
	return fetchJson<Partial<OidcClaims>>(discovery.userinfo_endpoint, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
};

export const isEmailVerified = (claims: Partial<OidcClaims>): boolean =>
	claims.email_verified === true || claims.email_verified === 'true';

/**
 * Reads role names from a claim. The claim name is used as is first (so
 * Zitadel's `urn:zitadel:iam:org:project:roles` works) and otherwise as a
 * dot separated path (e.g. Keycloak's `realm_access.roles`).
 *
 * Supports arrays (`["admin"]`), strings (`"admin user"`) and objects whose
 * keys are the role names (Zitadel: `{ "admin": { "<orgId>": "<domain>" } }`).
 */
export const extractRoles = (
	claims: Record<string, unknown>,
	claimName: string,
): string[] => {
	const value =
		claims[claimName] !== undefined
			? claims[claimName]
			: claimName
					.split('.')
					.reduce<unknown>(
						(current, key) =>
							current && typeof current === 'object'
								? (current as Record<string, unknown>)[key]
								: undefined,
						claims,
					);
	if (Array.isArray(value)) {
		return value.map(String);
	}
	if (typeof value === 'string') {
		return value.split(/[\s,]+/).filter(Boolean);
	}
	if (value && typeof value === 'object') {
		return Object.keys(value);
	}
	return [];
};

export type ProviderAccess =
	| { allowed: false }
	| { allowed: true; role?: UserRole };

/**
 * Decides from the provider's roles claim whether a person may sign in and
 * with which role.
 *
 * - With `userRoles`, only people with one of the user or admin roles may
 *   sign in. Everyone else is rejected, even if they already have a user.
 * - With `adminRoles`, the role is synced on every sign in: administrator
 *   with an admin role, regular user otherwise.
 * - Without either, the provider says nothing about access or role.
 */
export const resolveProviderAccess = (
	provider: Pick<OidcProviderConfig, 'rolesClaim' | 'adminRoles' | 'userRoles'>,
	claims: Record<string, unknown>,
): ProviderAccess => {
	const { rolesClaim, adminRoles, userRoles } = provider;
	if (!rolesClaim || (adminRoles.length === 0 && userRoles.length === 0)) {
		return { allowed: true };
	}
	const roles = extractRoles(claims, rolesClaim);
	const isAdmin = roles.some((role) => adminRoles.includes(role));
	if (isAdmin) {
		return { allowed: true, role: UserRole.ADMIN };
	}
	if (userRoles.length > 0 && !roles.some((role) => userRoles.includes(role))) {
		return { allowed: false };
	}
	return {
		allowed: true,
		role: adminRoles.length > 0 ? UserRole.USER : undefined,
	};
};

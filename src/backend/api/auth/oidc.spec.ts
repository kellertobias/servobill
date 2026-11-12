import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OidcProviderConfig } from './config';
import {
	buildAuthorizationUrl,
	clearOidcCaches,
	createPkcePair,
	exchangeCode,
	extractRoles,
	verifyIdToken,
} from './oidc';

const issuer = 'https://auth.example.com';
const provider: OidcProviderConfig = {
	id: 'zitadel',
	name: 'Zitadel',
	issuer,
	clientId: 'client-1',
	clientSecret: 'secret',
	scopes: 'openid email profile',
	tokenAuthMethod: 'client_secret_basic',
	autoProvision: false,
	requireVerifiedEmail: true,
	adminRoles: [],
};

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
	modulusLength: 2048,
});
const jwk = {
	...publicKey.export({ format: 'jwk' }),
	kid: 'key-1',
	use: 'sig',
	alg: 'RS256',
};

const sign = (claims: Record<string, unknown>, options: jwt.SignOptions = {}) =>
	jwt.sign(
		{ nonce: 'nonce-1', email: 'a@example.com', ...claims },
		privateKey,
		{
			algorithm: 'RS256',
			keyid: 'key-1',
			issuer,
			audience: 'client-1',
			subject: 'user-1',
			expiresIn: 300,
			...options,
		},
	);

const json = (body: unknown) =>
	new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'content-type': 'application/json' },
	});

describe('oidc', () => {
	const fetchMock = vi.fn();

	beforeEach(() => {
		clearOidcCaches();
		fetchMock.mockReset();
		fetchMock.mockImplementation(async (url: string) => {
			if (url === `${issuer}/.well-known/openid-configuration`) {
				return json({
					issuer,
					authorization_endpoint: `${issuer}/oauth/v2/authorize`,
					token_endpoint: `${issuer}/oauth/v2/token`,
					jwks_uri: `${issuer}/oauth/v2/keys`,
					userinfo_endpoint: `${issuer}/oidc/v1/userinfo`,
				});
			}
			if (url === `${issuer}/oauth/v2/keys`) {
				return json({ keys: [jwk] });
			}
			if (url === `${issuer}/oauth/v2/token`) {
				return json({
					id_token: 'the-id-token',
					access_token: 'the-access-token',
				});
			}
			return new Response('not found', { status: 404 });
		});
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('builds an authorization URL with PKCE', async () => {
		const { challenge } = createPkcePair();
		const url = new URL(
			await buildAuthorizationUrl(provider, {
				redirectUri: 'https://app.example.com/api/auth/oidc-callback',
				state: 'state-1',
				nonce: 'nonce-1',
				codeChallenge: challenge,
			}),
		);
		expect(url.origin + url.pathname).toBe(`${issuer}/oauth/v2/authorize`);
		expect(url.searchParams.get('response_type')).toBe('code');
		expect(url.searchParams.get('code_challenge_method')).toBe('S256');
		expect(url.searchParams.get('code_challenge')).toBe(challenge);
		expect(url.searchParams.get('client_id')).toBe('client-1');
	});

	it('rejects a discovery document for another issuer', async () => {
		fetchMock.mockImplementationOnce(async () =>
			json({
				issuer: 'https://evil.example.com',
				authorization_endpoint: 'x',
				token_endpoint: 'x',
				jwks_uri: 'x',
			}),
		);
		await expect(
			buildAuthorizationUrl(provider, {
				redirectUri: 'x',
				state: 's',
				nonce: 'n',
				codeChallenge: 'c',
			}),
		).rejects.toThrow(/issuer mismatch/);
	});

	it('exchanges the code with basic client authentication', async () => {
		await exchangeCode(provider, {
			code: 'code-1',
			redirectUri: 'https://app/cb',
			codeVerifier: 'verifier',
		});
		const [, init] = fetchMock.mock.calls.find(
			([url]) => url === `${issuer}/oauth/v2/token`,
		)!;
		expect(init.headers.Authorization).toBe(
			`Basic ${Buffer.from('client-1:secret').toString('base64')}`,
		);
		const body = new URLSearchParams(init.body);
		expect(body.get('code_verifier')).toBe('verifier');
		expect(body.get('client_secret')).toBeNull();
	});

	it('verifies a valid ID token', async () => {
		const claims = await verifyIdToken(provider, sign({}), 'nonce-1');
		expect(claims.sub).toBe('user-1');
		expect(claims.email).toBe('a@example.com');
	});

	it('rejects wrong nonce, audience, issuer and signature', async () => {
		await expect(
			verifyIdToken(provider, sign({}), 'other-nonce'),
		).rejects.toThrow(/nonce/);
		await expect(
			verifyIdToken(provider, sign({}, { audience: 'other' }), 'nonce-1'),
		).rejects.toThrow();
		await expect(
			verifyIdToken(provider, sign({}, { issuer: 'https://evil' }), 'nonce-1'),
		).rejects.toThrow();
		const forged = jwt.sign({ nonce: 'nonce-1' }, 'shared-secret', {
			algorithm: 'HS256',
			keyid: 'key-1',
			issuer,
			audience: 'client-1',
			subject: 'user-1',
		});
		await expect(verifyIdToken(provider, forged, 'nonce-1')).rejects.toThrow();
	});

	it('extracts roles from arrays, strings, objects and paths', () => {
		expect(
			extractRoles(
				{
					'urn:zitadel:iam:org:project:roles': {
						admin: { org: 'x' },
						user: {},
					},
				},
				'urn:zitadel:iam:org:project:roles',
			),
		).toEqual(['admin', 'user']);
		expect(extractRoles({ groups: ['a', 'b'] }, 'groups')).toEqual(['a', 'b']);
		expect(extractRoles({ roles: 'a b,c' }, 'roles')).toEqual(['a', 'b', 'c']);
		expect(
			extractRoles(
				{ realm_access: { roles: ['admin'] } },
				'realm_access.roles',
			),
		).toEqual(['admin']);
		expect(extractRoles({}, 'roles')).toEqual([]);
	});
});

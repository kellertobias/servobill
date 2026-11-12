/**
 * Authentication configuration, read from environment variables.
 *
 * Everything is read lazily so tests and long running processes see the
 * current environment. See README.md ("Authentication") for documentation.
 */

export const GOOGLE_PROVIDER_ID = 'google';
export const OAUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

/** @deprecated use getAuthConfig().google?.clientId */
export const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID;

export type TokenAuthMethod =
	| 'client_secret_basic'
	| 'client_secret_post'
	| 'none';

export type OidcProviderConfig = {
	/** Provider id used in URLs, state and linked identities. */
	id: string;
	/** Display name on the login button. */
	name: string;
	issuer: string;
	clientId: string;
	clientSecret?: string;
	scopes: string;
	tokenAuthMethod: TokenAuthMethod;
	/** Create a regular user for every person that can sign in at this provider. */
	autoProvision: boolean;
	/** Only accept (and match) users with a verified email address. */
	requireVerifiedEmail: boolean;
	/** Claim that carries the user's roles, e.g. `urn:zitadel:iam:org:project:roles`. */
	rolesClaim?: string;
	/** Values of the roles claim that make a user an administrator. */
	adminRoles: string[];
};

export type AuthConfig = {
	localEnabled: boolean;
	/** Legacy Google sign in (implicit flow, only needs the client id). */
	google?: { clientId: string };
	oidcProviders: OidcProviderConfig[];
	allowedEmails: Set<string>;
	adminEmails: Set<string>;
	initialAdmin?: { email: string; password: string; name: string };
};

type Env = Record<string, string | undefined>;

const isTrue = (value: string | undefined, fallback = false) => {
	if (value === undefined || value.trim() === '') {
		return fallback;
	}
	return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const emailSet = (value: string | undefined) =>
	new Set(
		(value || '')
			.split(',')
			.map((email) => email.trim().toLowerCase())
			.filter(Boolean),
	);

const list = (value: string | undefined) =>
	(value || '')
		.split(/[\s,]+/)
		.map((entry) => entry.trim())
		.filter(Boolean);

const PROVIDER_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,31}$/;

const readOidcProvider = (
	env: Env,
	id: string,
	prefix: string,
): OidcProviderConfig => {
	const get = (key: string) => {
		const value = env[`${prefix}${key}`];
		return value === undefined || value.trim() === ''
			? undefined
			: value.trim();
	};
	const issuer = get('ISSUER');
	const clientId = get('CLIENT_ID');
	if (!issuer || !clientId) {
		throw new Error(
			`OIDC provider "${id}" needs ${prefix}ISSUER and ${prefix}CLIENT_ID`,
		);
	}
	const clientSecret = get('CLIENT_SECRET');
	const tokenAuthMethod = (get('TOKEN_AUTH_METHOD') ||
		(clientSecret ? 'client_secret_basic' : 'none')) as TokenAuthMethod;
	if (
		!['client_secret_basic', 'client_secret_post', 'none'].includes(
			tokenAuthMethod,
		)
	) {
		throw new Error(
			`${prefix}TOKEN_AUTH_METHOD must be client_secret_basic, client_secret_post or none`,
		);
	}
	return {
		id,
		name: get('NAME') || id.charAt(0).toUpperCase() + id.slice(1),
		issuer: issuer.replace(/\/+$/, ''),
		clientId,
		clientSecret,
		scopes: get('SCOPES') || 'openid email profile',
		tokenAuthMethod,
		autoProvision: isTrue(get('AUTO_PROVISION')),
		requireVerifiedEmail: isTrue(get('REQUIRE_VERIFIED_EMAIL'), true),
		rolesClaim: get('ROLES_CLAIM'),
		adminRoles: list(get('ADMIN_ROLES')),
	};
};

export const getAuthConfig = (env: Env = process.env): AuthConfig => {
	const oidcProviders: OidcProviderConfig[] = [];

	// Single provider shorthand: OIDC_ISSUER, OIDC_CLIENT_ID, ...
	if (env.OIDC_ISSUER?.trim()) {
		oidcProviders.push(readOidcProvider(env, 'oidc', 'OIDC_'));
	}

	// Multiple providers: OIDC_PROVIDERS=zitadel,other and OIDC_ZITADEL_ISSUER, ...
	for (const rawId of list(env.OIDC_PROVIDERS)) {
		const id = rawId.toLowerCase();
		if (!PROVIDER_ID_PATTERN.test(id) || id === GOOGLE_PROVIDER_ID) {
			throw new Error(
				`Invalid OIDC provider id "${rawId}" (use a-z, 0-9, - and _, "google" is reserved)`,
			);
		}
		if (oidcProviders.some((provider) => provider.id === id)) {
			throw new Error(`OIDC provider "${id}" is configured twice`);
		}
		const prefix = `OIDC_${id.toUpperCase().replaceAll('-', '_')}_`;
		oidcProviders.push(readOidcProvider(env, id, prefix));
	}

	const googleClientId = env.OAUTH_CLIENT_ID?.trim();
	const initialAdminEmail = env.INITIAL_ADMIN_EMAIL?.trim();
	const initialAdminPassword = env.INITIAL_ADMIN_PASSWORD;

	return {
		localEnabled: isTrue(env.LOCAL_AUTH_ENABLED),
		google:
			googleClientId && googleClientId !== 'please-set'
				? { clientId: googleClientId }
				: undefined,
		oidcProviders,
		allowedEmails: emailSet(env.ALLOWED_EMAILS),
		adminEmails: emailSet(env.ADMIN_EMAILS),
		initialAdmin:
			initialAdminEmail && initialAdminPassword
				? {
						email: initialAdminEmail.toLowerCase(),
						password: initialAdminPassword,
						name: env.INITIAL_ADMIN_NAME?.trim() || 'Administrator',
					}
				: undefined,
	};
};

export const getOidcProvider = (
	id: string,
	config: AuthConfig = getAuthConfig(),
): OidcProviderConfig | undefined =>
	config.oidcProviders.find((provider) => provider.id === id);

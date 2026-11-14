import { describe, expect, it } from 'vitest';
import { getAuthConfig } from './config';

describe('getAuthConfig', () => {
	it('defaults to no providers and no local login', () => {
		const config = getAuthConfig({});
		expect(config.localEnabled).toBe(false);
		expect(config.google).toBeUndefined();
		expect(config.oidcProviders).toEqual([]);
	});

	it('reads the legacy google client and allow list', () => {
		const config = getAuthConfig({
			OAUTH_CLIENT_ID: 'abc',
			ALLOWED_EMAILS: 'A@example.com, b@example.com',
			ADMIN_EMAILS: 'a@example.com',
		});
		expect(config.google).toEqual({ clientId: 'abc' });
		expect([...config.allowedEmails]).toEqual([
			'a@example.com',
			'b@example.com',
		]);
		expect(config.adminEmails.has('a@example.com')).toBe(true);
	});

	it('reads multiple named OIDC providers', () => {
		const config = getAuthConfig({
			OIDC_PROVIDERS: 'zitadel, company-sso',
			OIDC_ZITADEL_ISSUER: 'https://auth.example.com/',
			OIDC_ZITADEL_CLIENT_ID: 'client',
			OIDC_ZITADEL_NAME: 'Zitadel',
			OIDC_ZITADEL_ROLES_CLAIM: 'urn:zitadel:iam:org:project:roles',
			OIDC_ZITADEL_ADMIN_ROLES: 'servobill-admin',
			OIDC_ZITADEL_USER_ROLES: 'servobill-user',
			OIDC_ZITADEL_AUTO_PROVISION: 'true',
			OIDC_COMPANY_SSO_ISSUER: 'https://sso.example.org',
			OIDC_COMPANY_SSO_CLIENT_ID: 'other',
			OIDC_COMPANY_SSO_CLIENT_SECRET: 'secret',
		});
		expect(config.oidcProviders).toHaveLength(2);
		const [zitadel, company] = config.oidcProviders;
		expect(zitadel).toMatchObject({
			id: 'zitadel',
			name: 'Zitadel',
			issuer: 'https://auth.example.com',
			tokenAuthMethod: 'none',
			autoProvision: true,
			requireVerifiedEmail: true,
			adminRoles: ['servobill-admin'],
			userRoles: ['servobill-user'],
		});
		expect(company).toMatchObject({
			id: 'company-sso',
			name: 'Company-sso',
			tokenAuthMethod: 'client_secret_basic',
			autoProvision: false,
		});
	});

	it('supports the single provider shorthand', () => {
		const config = getAuthConfig({
			OIDC_ISSUER: 'https://auth.example.com',
			OIDC_CLIENT_ID: 'client',
		});
		expect(config.oidcProviders[0].id).toBe('oidc');
	});

	it('rejects incomplete providers', () => {
		expect(() =>
			getAuthConfig({ OIDC_PROVIDERS: 'zitadel', OIDC_ZITADEL_ISSUER: 'x' }),
		).toThrow(/CLIENT_ID/);
		expect(() => getAuthConfig({ OIDC_PROVIDERS: 'google' })).toThrow(
			/reserved/,
		);
		expect(() =>
			getAuthConfig({
				OIDC_PROVIDERS: 'zitadel',
				OIDC_ZITADEL_ISSUER: 'https://auth.example.com',
				OIDC_ZITADEL_CLIENT_ID: 'client',
				OIDC_ZITADEL_USER_ROLES: 'servobill-user',
			}),
		).toThrow(/USER_ROLES needs OIDC_ZITADEL_ROLES_CLAIM/);
	});

	it('reads the initial admin only when email and password are set', () => {
		expect(
			getAuthConfig({ INITIAL_ADMIN_EMAIL: 'a@b.c' }).initialAdmin,
		).toBeUndefined();
		expect(
			getAuthConfig({
				LOCAL_AUTH_ENABLED: 'true',
				INITIAL_ADMIN_EMAIL: 'Admin@Example.com',
				INITIAL_ADMIN_PASSWORD: 'a-long-password',
			}),
		).toMatchObject({
			localEnabled: true,
			initialAdmin: { email: 'admin@example.com', name: 'Administrator' },
		});
	});
});

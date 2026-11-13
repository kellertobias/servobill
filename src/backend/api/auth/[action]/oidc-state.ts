import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import * as cookie from 'cookie';
import jwt from 'jsonwebtoken';

/**
 * The OIDC login state (state, nonce, PKCE verifier and provider) is kept in
 * a short-lived, signed, httpOnly cookie between authorize and callback.
 */

const STATE_COOKIE = 'oidc-login';
const STATE_TTL_SECONDS = 10 * 60;

export type OidcLoginState = {
	/** provider id */
	p: string;
	/** state */
	s: string;
	/** nonce */
	n: string;
	/** PKCE code verifier */
	v: string;
};

const getSecret = () => {
	const secret = process.env.JWT_SECRET;
	if (!secret) {
		throw new Error('JWT_SECRET not set');
	}
	return secret;
};

const cookieOptions = (maxAge: number) => ({
	httpOnly: true,
	secure: !(
		process.env.INSECURE_COOKIES === 'true' ||
		process.env.NODE_ENV === 'development'
	),
	sameSite: 'lax' as const,
	path: '/api/auth',
	maxAge,
});

export const makeStateCookie = (state: OidcLoginState): string =>
	cookie.serialize(
		STATE_COOKIE,
		jwt.sign({ oidc: state }, getSecret(), { expiresIn: STATE_TTL_SECONDS }),
		cookieOptions(STATE_TTL_SECONDS),
	);

export const clearStateCookie = (): string =>
	cookie.serialize(STATE_COOKIE, '', cookieOptions(0));

export const readStateCookie = (
	evt: APIGatewayProxyEventV2,
): OidcLoginState | null => {
	const cookies = cookie.parse(
		evt.cookies?.join?.(';') || evt.headers?.cookie || '',
	);
	const raw = cookies[STATE_COOKIE];
	if (!raw) {
		return null;
	}
	try {
		const decoded = jwt.verify(raw, getSecret()) as { oidc?: OidcLoginState };
		return decoded.oidc || null;
	} catch {
		return null;
	}
};

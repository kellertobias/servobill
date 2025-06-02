import { randomUUID } from 'crypto';

import {
	APIGatewayProxyEventV2,
	APIGatewayProxyHandlerV2,
	APIGatewayProxyStructuredResultV2,
	Context,
} from 'aws-lambda';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';

import { Logger } from '../services/logger.service';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
	throw new Error('JWT_SECRET not set');
}

const SESSION_COOKIE_NAME = 'Session-Token';
const REFRESH_COOKIE_NAME = 'Refresh-Token';
const SESSION_DURATION = 30 * 60; // * 60;
const REFRESH_DURATION = 30 * 24 * 60 * 60;

const logger = new Logger('Session');

export type LambdaContextSession = {
	user: Session | null;
	refreshable: boolean;
};

export type SessionLambdaContext = Omit<Context, 'identity'> & {
	identity: LambdaContextSession;
};

export class Session {
	public userId!: string;
	public name!: string;
	public email!: string;
	public picture?: string;
	public sessionId!: string;
	public renewalId!: string;
	public roles!: string[];

	constructor(
		props: Omit<Session, 'renewalId' | 'sessionId'> & Partial<Session>,
	) {
		Object.assign(this, props);
		if (!props.renewalId) {
			this.renewalId = randomUUID().toString();
		}
		if (!props.sessionId) {
			this.sessionId = randomUUID().toString();
		}
	}
}

const makeTokenCookieInternal = (
	content: Session | null,
	type: 'SESSION' | 'REFRESH',
): string => {
	const expiresIn = type === 'SESSION' ? SESSION_DURATION : REFRESH_DURATION;
	const token = content
		? jwt.sign({ dat: content }, JWT_SECRET, { expiresIn })
		: '';

	return cookie.serialize(
		type === 'SESSION' ? SESSION_COOKIE_NAME : REFRESH_COOKIE_NAME,
		token,
		{
			httpOnly: true,
			secure: process.env.NODE_ENV !== 'development',
			sameSite: 'lax',
			maxAge: content ? expiresIn : 0,
			path: '/',
		},
	);
};

export const makeTokenCookie = {
	session: (content: Session | null): string =>
		makeTokenCookieInternal(content, 'SESSION'),
	refresh: (content: Session | null): string =>
		makeTokenCookieInternal(content, 'REFRESH'),
};

export type JwtToken = Pick<
	jwt.JwtPayload,
	'iss' | 'sub' | 'aud' | 'exp' | 'nbf' | 'iat' | 'jti'
> & {
	expired?: boolean;
	invalid?: boolean;
	message?: string;
	error?: Error;
} & { dat?: Session | null };

const getRawTokenFromCookies = (
	cookies: Record<string, string>,
	type: 'SESSION' | 'REFRESH',
): string | undefined => {
	return type === 'SESSION'
		? cookies[SESSION_COOKIE_NAME]
		: cookies[REFRESH_COOKIE_NAME];
};

const getRawTokenFromEvent = (
	evt: APIGatewayProxyEventV2,
	type: 'SESSION' | 'REFRESH',
): string | undefined => {
	const authHeader =
		evt.headers['Authorization'] || evt.headers['authorization'] || '';
	const headerToken = authHeader.split(' ')[1];
	const cookies = cookie.parse(
		evt.cookies?.join?.(';') || evt.headers.cookie || '',
	);

	return (
		(type === 'SESSION' ? headerToken : undefined) ||
		getRawTokenFromCookies(cookies, type)
	);
};

const extractTokenInternal = (
	evt:
		| APIGatewayProxyEventV2
		| { headers?: undefined; cookies: Record<string, string> },
	type: 'SESSION' | 'REFRESH',
): JwtToken | null => {
	const token = evt.headers
		? getRawTokenFromEvent(evt, type)
		: getRawTokenFromCookies(evt.cookies, type);

	if (!token) {
		return null;
	}

	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		if (typeof decoded === 'string') {
			return null;
		}
		return decoded as JwtToken;
	} catch (error: unknown) {
		const invalidToken = (jwt.decode(token) as jwt.JwtPayload) || { dat: null };
		if (error instanceof jwt.TokenExpiredError) {
			return { ...invalidToken, expired: true, invalid: true };
		}
		if (error instanceof jwt.NotBeforeError) {
			logger.warn('Token is not valid yet');
			return {
				...invalidToken,
				expired: true,
				invalid: true,
				message: 'Token is not valid yet',
			};
		}
		// eslint-disable-next-line no-console
		console.error(error);
		if (error instanceof jwt.JsonWebTokenError) {
			return { ...invalidToken, invalid: true, message: error.message, error };
		}
		if (error instanceof Error) {
			return { ...invalidToken, invalid: true, message: error.message, error };
		}
		return { invalid: true, error: new Error(String(error)) };
	}
};

export const extractToken = {
	session: (
		evt: APIGatewayProxyEventV2 | { cookies: Record<string, string> },
	) => extractTokenInternal(evt, 'SESSION'),
	refresh: (
		evt: APIGatewayProxyEventV2 | { cookies: Record<string, string> },
	) => extractTokenInternal(evt, 'REFRESH'),
};

export const returnUnauthorized = (message: {
	message: string;
	renewable?: boolean;
}): APIGatewayProxyStructuredResultV2 => ({
	statusCode: 401,
	body: JSON.stringify({ ...message, success: false }),
	cookies: [
		// makeTokenCookie.session(null)
	],
});

export const withSession = (
	handler: (
		evt: APIGatewayProxyEventV2,
		ctx: SessionLambdaContext,
	) => Promise<APIGatewayProxyStructuredResultV2 | void>,
	options?: {
		requireActiveSession?: boolean;
	},
): APIGatewayProxyHandlerV2<unknown> => {
	return async (evt, ctx) => {
		let token: JwtToken | null = null;
		let renewToken: JwtToken | null = null;
		try {
			token = extractToken.session(evt);
		} catch (error: unknown) {
			logger.warn('Catch ERROR', { error });
			return returnUnauthorized({
				message: 'Invalid session',
				renewable: true,
			});
		}

		try {
			renewToken = extractToken.refresh(evt);
		} catch {
			// pass
		}

		if (token?.expired) {
			logger.info('Token expired');
			return returnUnauthorized({
				message: 'Session Expired',
				renewable: true,
			});
		}

		if ((!token || token.invalid) && options?.requireActiveSession) {
			logger.info('Invalid or no token');
			return returnUnauthorized({
				message: 'No Active Session',
				renewable: true,
			});
		}

		return await handler(evt, {
			...ctx,
			identity: {
				user: token && !token.invalid && token.dat ? token.dat : null,
				refreshable:
					renewToken && !renewToken.invalid && !!renewToken.dat ? true : false,
			},
		});
	};
};

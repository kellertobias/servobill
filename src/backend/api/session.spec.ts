/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * @fileoverview
 * Integration tests for session.ts, covering session management utilities.
 * These tests use the real 'cookie' and 'jsonwebtoken' modules to verify actual behavior.
 * No dependencies are mocked; this ensures that encoding, decoding, expiry, and cookie serialization
 * are tested as they would be in production.
 *
 * NOTE: Uses a static JWT secret for reproducibility.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type {
	APIGatewayProxyEventV2,
	Context,
	APIGatewayProxyStructuredResultV2,
	APIGatewayEventRequestContextV2,
} from 'aws-lambda';
import * as cookie from 'cookie';
import jwt from 'jsonwebtoken';

// Set up environment variables (other than JWT_SECRET)
const OLD_ENV = { ...process.env };
beforeEach(() => {
	process.env.INSECURE_COOKIES = 'true';
});
afterEach(() => {
	process.env = { ...OLD_ENV };
});

/**
 * IMPORTANT: Import session utilities *after* setting process.env.JWT_SECRET.
 * This ensures that the JWT secret is available during module initialization,
 * preventing invalid signature errors in tests.
 */
import {
	Session,
	makeTokenCookie,
	extractToken,
	returnUnauthorized,
	withSession,
} from './session';

/**
 * Test: Session class constructor and property assignment
 */
describe('Session', () => {
	it('should assign properties and generate IDs if missing', () => {
		const s = new Session({
			userId: 'u1',
			name: 'Test',
			email: 't@e.com',
			roles: ['admin'],
		});
		expect(s.userId).toBe('u1');
		expect(s.name).toBe('Test');
		expect(s.email).toBe('t@e.com');
		expect(s.roles).toEqual(['admin']);
		expect(typeof s.sessionId).toBe('string');
		expect(typeof s.renewalId).toBe('string');
	});
	it('should use provided sessionId/renewalId if present', () => {
		const s = new Session({
			userId: 'u2',
			name: 'Test2',
			email: 't2@e.com',
			roles: [],
			sessionId: 'sid',
			renewalId: 'rid',
		});
		expect(s.sessionId).toBe('sid');
		expect(s.renewalId).toBe('rid');
	});
});

/**
 * Test: makeTokenCookie
 * Ensures correct cookie serialization for session and refresh tokens.
 */
describe('makeTokenCookie', () => {
	it('should serialize session cookie with token', () => {
		const session = new Session({
			userId: 'u1',
			name: 'Test',
			email: 't@e.com',
			roles: [],
		});
		const cookieStr = makeTokenCookie.session(session);
		const parsed = cookie.parse(cookieStr);
		const token = String((parsed['Session-Token'] ?? '') as string);
		const decodedNoVerify = jwt.decode(token) as { iat?: number; exp?: number };
		console.log(
			'Session-Token iat:',
			decodedNoVerify?.iat,
			'exp:',
			decodedNoVerify?.exp,
			'now:',
			Math.floor(Date.now() / 1000),
		);
		const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
			dat: Session;
		};
		expect(decoded.dat.userId).toBe('u1');
		expect(decoded.dat.name).toBe('Test');
		expect(decoded.dat.email).toBe('t@e.com');
	});
	it('should serialize refresh cookie with token', () => {
		const session = new Session({
			userId: 'u2',
			name: 'Test2',
			email: 't2@e.com',
			roles: [],
		});
		const cookieStr = makeTokenCookie.refresh(session);
		const parsed = cookie.parse(cookieStr);
		const token = String((parsed['Refresh-Token'] ?? '') as string);
		const decodedNoVerify = jwt.decode(token) as { iat?: number; exp?: number };
		console.log(
			'Refresh-Token iat:',
			decodedNoVerify?.iat,
			'exp:',
			decodedNoVerify?.exp,
			'now:',
			Math.floor(Date.now() / 1000),
		);
		const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
			dat: Session;
		};
		expect(decoded.dat.userId).toBe('u2');
		expect(decoded.dat.name).toBe('Test2');
		expect(decoded.dat.email).toBe('t2@e.com');
	});
	it('should clear cookie if content is null', () => {
		const cookieStr = makeTokenCookie.session(null);
		const parsed = cookie.parse(cookieStr);
		expect(parsed['Session-Token']).toBe('');
	});
});

/**
 * Test: extractToken
 * Ensures correct extraction and verification of tokens from event/cookies.
 */
describe('extractToken', () => {
	const evt: APIGatewayProxyEventV2 = {
		version: '2.0',
		routeKey: '',
		rawPath: '',
		rawQueryString: '',
		headers: {},
		requestContext: {} as APIGatewayEventRequestContextV2,
		isBase64Encoded: false,
		cookies: [],
		queryStringParameters: undefined,
		pathParameters: undefined,
		body: undefined,
		stageVariables: undefined,
	};
	it('should return null if no token present', () => {
		const result = extractToken.session(evt);
		expect(result).toBeNull();
	});
	it('should decode and return token payload', () => {
		const session = new Session({
			userId: 'u1',
			name: 'Test',
			email: 't@e.com',
			roles: [],
		});
		const cookieStr = makeTokenCookie.session(session);
		const parsed = cookie.parse(cookieStr);
		// Defensive: fallback to empty string if token is undefined
		const token = parsed['Session-Token'] ?? '';
		const eventWithCookie = { ...evt, cookies: [`Session-Token=${token}`] };
		const result = extractToken.session(eventWithCookie);
		expect(result).toBeDefined();
		expect(result?.dat?.userId).toBe('u1');
	});
	it('should handle expired token', () => {
		const session = new Session({
			userId: 'u2',
			name: 'Test2',
			email: 't2@e.com',
			roles: [],
		});
		// IMPORTANT: Use the same secret as the implementation to avoid invalid signature errors
		const token = jwt.sign({ dat: session }, process.env.JWT_SECRET!, {
			expiresIn: -1,
		});
		const eventWithCookie = { ...evt, cookies: [`Session-Token=${token}`] };
		const result = extractToken.session(eventWithCookie);
		// When token is expired, extractToken returns an object with expired and invalid set to true
		expect(result).toBeDefined();
		expect(result?.expired).toBe(true);
		expect(result?.invalid).toBe(true);
	});
});

/**
 * Test: returnUnauthorized
 * Ensures correct 401 response structure.
 */
describe('returnUnauthorized', () => {
	it('should return 401 with message and success false', () => {
		const res = returnUnauthorized({ message: 'fail', renewable: true });
		expect(res.statusCode).toBe(401);
		const body = JSON.parse(res.body!);
		expect(body.message).toBe('fail');
		expect(body.success).toBe(false);
		expect(Array.isArray(res.cookies)).toBe(true);
	});
});

/**
 * Test: withSession
 * Ensures handler is wrapped and session is extracted/validated.
 */
describe('withSession', () => {
	const evt: APIGatewayProxyEventV2 = {
		version: '2.0',
		routeKey: '',
		rawPath: '',
		rawQueryString: '',
		headers: {},
		requestContext: {} as APIGatewayEventRequestContextV2,
		isBase64Encoded: false,
		cookies: [],
		queryStringParameters: undefined,
		pathParameters: undefined,
		body: undefined,
		stageVariables: undefined,
	};
	const ctx: Context = {
		callbackWaitsForEmptyEventLoop: false,
		functionName: '',
		functionVersion: '',
		invokedFunctionArn: '',
		memoryLimitInMB: '',
		awsRequestId: '',
		logGroupName: '',
		logStreamName: '',
		getRemainingTimeInMillis: () => 0,
		done: () => {},
		fail: () => {},
		succeed: () => {},
	};
	it('should call handler with identity if token valid', async () => {
		const session = new Session({
			userId: 'u1',
			name: 'Test',
			email: 't@e.com',
			roles: [],
		});
		const cookieStr = makeTokenCookie.session(session);
		const parsed = cookie.parse(cookieStr);
		const token = parsed['Session-Token'] ?? '';
		const eventWithCookie = { ...evt, cookies: [`Session-Token=${token}`] };
		// Handler returns a valid APIGatewayProxyStructuredResultV2
		const handler = async (
			_event: APIGatewayProxyEventV2,
			_context: import('./session').SessionLambdaContext,
		): Promise<APIGatewayProxyStructuredResultV2> => ({
			statusCode: 200,
			body: JSON.stringify({ ok: true, context: _context }),
			cookies: [],
		});
		const wrapped = withSession(handler);
		const res = await wrapped(eventWithCookie, ctx, () => {});
		const body = JSON.parse((res as APIGatewayProxyStructuredResultV2).body!);
		expect(body.ok).toBe(true);
		// Check that context.identity.user is present
		expect(body.context.identity.user.userId).toBe('u1');
	});
	it('should return unauthorized if token expired', async () => {
		const session = new Session({
			userId: 'u2',
			name: 'Test2',
			email: 't2@e.com',
			roles: [],
		});
		// IMPORTANT: Use the same secret as the implementation to avoid invalid signature errors
		const token = jwt.sign({ dat: session }, process.env.JWT_SECRET!, {
			expiresIn: -1,
		});
		const eventWithCookie = { ...evt, cookies: [`Session-Token=${token}`] };
		const handler = async (
			_event: APIGatewayProxyEventV2,
			_context: import('./session').SessionLambdaContext,
		): Promise<APIGatewayProxyStructuredResultV2> => ({
			statusCode: 200,
			body: JSON.stringify({ ok: true }),
			cookies: [],
		});
		const wrapped = withSession(handler);
		const res = await wrapped(eventWithCookie, ctx, () => {});
		// When token is expired, withSession should return 401 Unauthorized
		expect((res as APIGatewayProxyStructuredResultV2).statusCode).toBe(401);
		expect((res as APIGatewayProxyStructuredResultV2).body).toContain(
			'Session Expired',
		);
	});
	it('should return unauthorized if no token and requireActiveSession', async () => {
		const handler = async (
			_event: APIGatewayProxyEventV2,
			_context: import('./session').SessionLambdaContext,
		): Promise<APIGatewayProxyStructuredResultV2> => ({
			statusCode: 200,
			body: JSON.stringify({ ok: true }),
			cookies: [],
		});
		const wrapped = withSession(handler, { requireActiveSession: true });
		const res = await wrapped(evt, ctx, () => {});
		expect((res as APIGatewayProxyStructuredResultV2).statusCode).toBe(401);
		expect((res as APIGatewayProxyStructuredResultV2).body).toContain(
			'No Active Session',
		);
	});
});

describe('JWT minimal test', () => {
	it('should sign and verify a token with process.env.JWT_SECRET', () => {
		const payload = { foo: 'bar' };
		const secret = process.env.JWT_SECRET!;
		const token = jwt.sign(payload, secret);
		const decoded = jwt.verify(token, secret) as { foo: string };
		expect(decoded.foo).toBe('bar');
	});
});

describe('JWT payload structure test', () => {
	it('should sign and verify a token with the same payload as makeTokenCookieInternal', () => {
		const session = new Session({
			userId: 'u1',
			name: 'Test',
			email: 't@e.com',
			roles: [],
		});
		const payload = { dat: { ...session, type: 'SESSION' } };
		console.log('Payload for sign:', payload);
		const secret = process.env.JWT_SECRET!;
		const token = jwt.sign(payload, secret);
		console.log('Token:', token);
		const decoded = jwt.verify(token, secret) as typeof payload;
		expect(decoded.dat.userId).toBe('u1');
		expect(decoded.dat.type).toBe('SESSION');
	});
});

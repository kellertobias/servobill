import { withSpan } from '@/backend/instrumentation';
import { Logger } from '@/backend/services/logger.service';
import { UserDirectoryService } from '@/backend/services/user-directory.service';
import { DefaultContainer } from '@/common/di';
import { getBody } from '../../helpers';
import type { APIHandler } from '../../types';
import { AuthenticationService } from '../authentication';
import { getAuthConfig } from '../config';

const logger = new Logger('LocalAuth');

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;

/**
 * Best effort brute force protection. The counter lives in memory, so it is
 * per container / Lambda instance. Put a rate limiting proxy or WAF in front
 * of the app for stronger guarantees.
 */
const failures = new Map<string, { count: number; since: number }>();

const isLockedOut = (key: string) => {
	const entry = failures.get(key);
	if (!entry) {
		return false;
	}
	if (Date.now() - entry.since > WINDOW_MS) {
		failures.delete(key);
		return false;
	}
	return entry.count >= MAX_FAILURES;
};

const recordFailure = (key: string) => {
	const entry = failures.get(key);
	if (!entry || Date.now() - entry.since > WINDOW_MS) {
		failures.set(key, { count: 1, since: Date.now() });
	} else {
		entry.count += 1;
	}
};

export const localLoginHandler: APIHandler = withSpan(
	{
		name: 'api.auth.local-login',
	},
	async (evt) => {
		const auth = DefaultContainer.get(AuthenticationService);
		const method = evt.requestContext?.http?.method || 'POST';
		if (method !== 'POST') {
			return auth.generateResponse({
				statusCode: 405,
				body: { message: 'Method not allowed' },
			});
		}
		if (!getAuthConfig().localEnabled) {
			return auth.generateResponse({
				statusCode: 404,
				body: { message: 'Local sign in is disabled' },
			});
		}

		let body: { email?: unknown; password?: unknown } | null = null;
		try {
			body = getBody(evt);
		} catch {
			body = null;
		}
		const email = typeof body?.email === 'string' ? body.email.trim() : '';
		const password = typeof body?.password === 'string' ? body.password : '';
		const key = email.toLowerCase();

		if (!email || !password) {
			return auth.generateResponse({
				statusCode: 400,
				body: { message: 'Email and password are required' },
			});
		}
		if (isLockedOut(key)) {
			return auth.generateResponse({
				statusCode: 429,
				body: { message: 'Too many failed attempts. Try again later.' },
			});
		}

		const user = await DefaultContainer.get(
			UserDirectoryService,
		).authenticateLocal(email, password);

		if (!user) {
			recordFailure(key);
			logger.info('Failed local sign in');
			return auth.generateResponse({
				statusCode: 401,
				body: { message: 'Invalid email or password' },
			});
		}

		failures.delete(key);
		return auth.startSession(evt, { user });
	},
);

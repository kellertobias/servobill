import type { NextRequest } from 'next/server';

import { extractToken, type JwtToken } from '@/backend/api/session';

/**
 * Authentication validation result containing token information and validation status
 */
export interface AuthValidationResult {
	/** Whether the authentication is valid */
	isValid: boolean;
	/** The extracted JWT token (null if invalid/missing) */
	token: JwtToken | null;
	/** User session data if token is valid */
	session: JwtToken['dat'] | null;
	/** Error message if authentication failed */
	error?: string;
}

/**
 * Validates authentication by extracting and checking the session token from cookies
 *
 * This function extracts cookies from a Next.js request, calls extractToken.session(),
 * and validates that the returned token is valid (!token.invalid) and not expired (!token.expired).
 *
 * @param request - The Next.js request object containing cookies
 * @returns Promise<AuthValidationResult> - Object containing validation status and token data
 *
 * @example
 * ```typescript
 * // In a Next.js API route handler
 * export async function GET(request: NextRequest) {
 *   const auth = await checkAuth(request);
 *
 *   if (!auth.isValid) {
 *     return Response.json({ error: auth.error }, { status: 401 });
 *   }
 *
 *   // auth.session contains the user data
 *   return Response.json({ user: auth.session });
 * }
 * ```
 */
export async function checkAuth(
	request: NextRequest,
): Promise<AuthValidationResult> {
	try {
		// Extract cookies from the Next.js request
		const cookies: Record<string, string> = {};

		// Parse cookies from the request headers
		const cookieHeader = request.headers.get('cookie');
		if (cookieHeader) {
			cookieHeader.split(';').forEach((cookie) => {
				const [name, value] = cookie.trim().split('=');
				if (name && value) {
					cookies[name] = value;
				}
			});
		}

		// Call extractToken.session with the cookies
		const token = extractToken.session({ cookies });

		// Check if token is valid and not expired
		if (!token) {
			return {
				isValid: false,
				token: null,
				session: null,
				error: 'No authentication token found',
			};
		}

		if (token.invalid) {
			return {
				isValid: false,
				token,
				session: null,
				error: token.message || 'Invalid authentication token',
			};
		}

		if (token.expired) {
			return {
				isValid: false,
				token,
				session: null,
				error: 'Authentication token has expired',
			};
		}

		// Token is valid and not expired
		return {
			isValid: true,
			token,
			session: token.dat || null,
		};
	} catch (error) {
		// Handle any unexpected errors during token extraction
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown authentication error';

		return {
			isValid: false,
			token: null,
			session: null,
			error: errorMessage,
		};
	}
}

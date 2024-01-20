import { randomUUID } from 'crypto';

import type {
	APIGatewayProxyEventV2,
	APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';

import { JwtToken, Session, extractToken, makeTokenCookie } from '../session';

import {
	SessionRepository,
	UserEntity,
} from '@/backend/repositories/session.repository';
import { Inject, Service } from '@/common/di';
import { Logger } from '@/backend/services/logger.service';
import { Span } from '@/backend/instrumentation';

const logger = new Logger('Session');

enum SessionOp {
	UNCHANGED,
	END,
}

const DEFAULT_SESSION_EXPIRATION = 90 * 24 * 60 * 60 * 1000; // 90 days

const makeForwardPage = (url: string) => `<html>
<body>
	<script type="text/javascript">
		window.location="${url}";
	</script>
	If the Page does not reload automatically
	<a href="${url}">click here to continue</a>
</body>
</html>`;

@Service()
export class AuthenticationService {
	constructor(
		@Inject(SessionRepository) private sessionRepository: SessionRepository,
	) {}

	@Span('AuthenticationService.generateResponse')
	public generateResponse(props: {
		statusCode: number;
		body?: Record<string, unknown>;
		forwardUrl?: string;
		session?: Session | SessionOp;
	}): APIGatewayProxyStructuredResultV2 {
		const { statusCode, body, session, forwardUrl } = props;

		const cookies =
			session === SessionOp.UNCHANGED || session === undefined
				? []
				: session === SessionOp.END
					? [makeTokenCookie.session(null), makeTokenCookie.refresh(null)]
					: [
							makeTokenCookie.session(session),
							makeTokenCookie.refresh(session),
						];

		return {
			statusCode,
			headers: {
				'Content-Type': forwardUrl ? 'text/html' : 'application/json',
			},
			body: forwardUrl
				? makeForwardPage(forwardUrl)
				: JSON.stringify({ ...body, success: statusCode < 400 }),
			cookies,
		};
	}

	@Span('AuthenticationService.startSession')
	public async startSession(
		event: APIGatewayProxyEventV2,
		options: {
			user: UserEntity;
			expireIn?: number;
			forwardUrl?: string;
		},
	): Promise<APIGatewayProxyStructuredResultV2> {
		const renewalId = randomUUID().toString();
		const { user } = options;
		const sessionEntity = await this.sessionRepository.createSession({
			userId: user.userId,
			expiresAt: new Date(
				Date.now() + (options?.expireIn || DEFAULT_SESSION_EXPIRATION),
			),
			renewalId,
		});

		const session = new Session({
			...user,
			picture: user.profilePictureUrl,
			sessionId: sessionEntity.sessionId,
			renewalId,
		});

		logger.debug('Starting session', { sessionEntity, session });

		return this.generateResponse({
			statusCode: 200,
			body: { message: 'Session started' },
			forwardUrl: options?.forwardUrl,
			session,
		});
	}

	@Span('AuthenticationService.endSession')
	public async endSession(
		event: APIGatewayProxyEventV2,
		options?: {
			forwardUrl?: string;
		},
	): Promise<APIGatewayProxyStructuredResultV2> {
		logger.debug('Ending session');
		try {
			const token = extractToken.refresh(event) || extractToken.session(event);
			if (!token || !token.dat?.sessionId) {
				return this.generateResponse({
					statusCode: 401,
					body: { message: 'No Tokens Set' },
					forwardUrl: options?.forwardUrl,
					session: SessionOp.END,
				});
			}

			await this.sessionRepository.deleteSession(token.dat.sessionId);

			return this.generateResponse({
				statusCode: 200,
				body: { message: 'Session ended' },
				forwardUrl: options?.forwardUrl,
				session: SessionOp.END,
			});
		} catch (error: unknown) {
			logger.error('Error ending session', { error });
			return this.generateResponse({
				statusCode: 401,
				body: { message: 'No Tokens Set' },
				forwardUrl: options?.forwardUrl,
				session: SessionOp.END,
			});
		}
	}

	@Span('AuthenticationService.renewSession')
	public async renewSession(
		event: APIGatewayProxyEventV2,
		options?: {
			forwardUrl?: string;
		},
	): Promise<APIGatewayProxyStructuredResultV2> {
		logger.debug('RENEWING SESSION');
		let token: JwtToken | null = null;
		try {
			token = extractToken.refresh(event);
			if (token && token.expired) {
				return this.endSession(event, options);
			}
			if (!token || token.invalid || !token.dat?.sessionId) {
				return this.generateResponse({
					statusCode: 401,
					body: { message: 'No Tokens Set' },
					forwardUrl: options?.forwardUrl,
					session: SessionOp.END,
				});
			}
		} catch (error: unknown) {
			console.error(error);
			return this.generateResponse({
				statusCode: 401,
				body: { message: 'Invalid refresh token' },
				forwardUrl: options?.forwardUrl,
				session: SessionOp.END,
			});
		}

		const data = token.dat;

		const sessionEntity = await this.sessionRepository.getSession(
			data.sessionId,
		);

		// If we do not have a session, then we should end the session
		// If the session is expired, then we should end the session
		if (!sessionEntity || sessionEntity.expiresAt.getTime() < Date.now()) {
			return this.generateResponse({
				statusCode: 401,
				body: { message: 'Invalid refresh token' },
				forwardUrl: options?.forwardUrl,
				session: SessionOp.END,
			});
		}

		// If the renewal id does not match, then we should end the session
		// This is to prevent replay attacks
		if (sessionEntity.renewalId !== data.renewalId) {
			await this.sessionRepository.deleteSession(data.sessionId);

			return this.generateResponse({
				statusCode: 401,
				body: { message: 'Refresh Token was already used' },
				forwardUrl: options?.forwardUrl,
				session: SessionOp.END,
			});
		}

		const user = await this.sessionRepository.findUserForSession(data);

		if (!user) {
			return this.generateResponse({
				statusCode: 403,
				body: { message: 'No such user' },
				forwardUrl: options?.forwardUrl,
				session: SessionOp.END,
			});
		}

		const session = new Session({
			...user,
			picture: user.profilePictureUrl,
			sessionId: sessionEntity.sessionId,
			renewalId: undefined, // This forces a new renewal id to be generated
		});

		await this.sessionRepository.updateSession(sessionEntity.sessionId, {
			updatedAt: new Date(),
			expiresAt: new Date(Date.now() + DEFAULT_SESSION_EXPIRATION),
			renewalId: session.renewalId,
		});

		return this.generateResponse({
			statusCode: 200,
			body: { message: 'Session renewed' },
			forwardUrl: options?.forwardUrl,
			session,
		});
	}
}

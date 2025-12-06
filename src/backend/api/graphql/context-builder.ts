import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import * as cookie from 'cookie';

import type { SessionLambdaContext } from '../session';

import type { GqlContext } from './types';

export const contextBuilder = async ({
	event,
	context,
}: {
	event: APIGatewayProxyEventV2;
	context: SessionLambdaContext;
}): Promise<GqlContext> => {
	const cookies = cookie.parse(
		event.cookies?.join?.(';') || event.headers.cookie || '',
	) as Record<string, string>;

	return {
		http: {
			domainName: event.requestContext.domainName,
			headers: event.headers,
			cookies: cookies,
			path: event.rawPath,
			sourceIp: event.requestContext.http.sourceIp,
			userAgent: event.requestContext.http.userAgent,
		},
		accountId: event.requestContext.accountId,
		requestId: event.requestContext.requestId,
		session: context.identity,
		functionName: context.functionName,
		functionVersion: context.functionVersion,
		getRemainingTimeInMillis: context.getRemainingTimeInMillis,
	};
};

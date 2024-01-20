import 'reflect-metadata';

import { APIGatewayProxyEventV2 } from 'aws-lambda';
import cookie from 'cookie';

import { SessionLambdaContext, withSession } from '../session';

import { getGraphQLServer } from './server';
import { GqlContext } from './types';

import { withInstrumentation } from '@/backend/instrumentation';

const contextBuilder = async ({
	event,
	context,
}: {
	event: APIGatewayProxyEventV2;
	context: SessionLambdaContext;
}): Promise<GqlContext> => {
	const cookies = cookie.parse(
		event.cookies?.join?.(';') || event.headers.cookie || '',
	);

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

export const method = 'ANY';
export const handlerName = 'handler';
export const handler = withInstrumentation(
	{
		name: 'api.graphql',
	},
	withSession(async (evt, ctx) => {
		const gqlHandler = await getGraphQLServer(contextBuilder);
		const answer = await gqlHandler(
			{ ...evt, httpMethod: evt.requestContext.http.method },
			ctx,
			() => {},
		);
		return answer;
	}),
);

import {
	ApolloServer,
	type ApolloServerOptions,
	type BaseContext,
	HeaderMap,
} from '@apollo/server';
import type {
	APIGatewayProxyEventV2,
	APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';
import type { GraphQLSchema } from 'graphql';
import { formatError } from './format-error';

export type ContextBuilder<C, Ctx> = (args: {
	event: APIGatewayProxyEventV2;
	context: C;
}) => Promise<Ctx>;

export type GraphqlLambdaHandler<C> = (
	event: APIGatewayProxyEventV2,
	context: C,
) => Promise<APIGatewayProxyStructuredResultV2>;

const CORS_HEADERS = {
	'access-control-allow-origin': '*',
	'access-control-allow-credentials': 'true',
};

/**
 * Creates an Apollo server for the given schema with the options shared
 * between the deployed handler and the tests.
 */
export function createApolloServer<Ctx extends BaseContext>(
	schema: GraphQLSchema,
	options: Partial<ApolloServerOptions<Ctx>> = {},
) {
	return new ApolloServer<Ctx>({
		schema,
		introspection: true,
		formatError,
		...options,
	} as ApolloServerOptions<Ctx>);
}

/**
 * Adapts an Apollo server to API Gateway v2 style events, which is what both
 * the Lambda deployment and the Next.js API bridge pass to the handlers.
 */
export function toLambdaHandler<C, Ctx extends BaseContext>(
	server: ApolloServer<Ctx>,
	contextBuilder: ContextBuilder<C, Ctx>,
): GraphqlLambdaHandler<C> {
	const started = server.start();

	return async (event, context) => {
		await started;
		const method = event.requestContext.http.method.toUpperCase();
		if (method === 'OPTIONS') {
			// No body: a 204 response must not have one
			return { statusCode: 204, headers: CORS_HEADERS };
		}

		const headers = new HeaderMap();
		for (const [key, value] of Object.entries(event.headers || {})) {
			if (value !== undefined) {
				headers.set(key.toLowerCase(), value);
			}
		}

		const rawBody =
			event.body && event.isBase64Encoded
				? Buffer.from(event.body, 'base64').toString('utf8')
				: event.body;
		let body: unknown = rawBody;
		if (rawBody && headers.get('content-type')?.includes('application/json')) {
			try {
				body = JSON.parse(rawBody);
			} catch {
				return {
					statusCode: 400,
					headers: CORS_HEADERS,
					body: 'Invalid JSON body',
				};
			}
		}

		const response = await server.executeHTTPGraphQLRequest({
			httpGraphQLRequest: {
				method,
				headers,
				search: event.rawQueryString || '',
				body,
			},
			context: () => contextBuilder({ event, context }),
		});

		let responseBody = '';
		if (response.body.kind === 'complete') {
			responseBody = response.body.string;
		} else {
			for await (const chunk of response.body.asyncIterator) {
				responseBody += chunk;
			}
		}

		return {
			statusCode: response.status ?? 200,
			headers: {
				...CORS_HEADERS,
				...Object.fromEntries(response.headers),
			},
			body: responseBody,
		};
	};
}

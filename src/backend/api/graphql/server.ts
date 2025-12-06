import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';
import { ApolloServer } from 'apollo-server-lambda';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { formatError } from './format-error';
import { globalSchema } from './schema';

export async function getGraphQLServer<E, C, Ctx>(
	contextBuilder: ({
		event,
		context,
	}: {
		event: E;
		context: C;
	}) => Promise<Ctx>,
) {
	const schema = await globalSchema;
	const server = new ApolloServer({
		schema,
		introspection: true,
		// TODO handle caching:
		// import { InMemoryLRUCache } from '@apollo/utils.keyvaluecache';
		// { cache: new InMemoryLRUCache() }
		// if we are not serverless
		// for now, we just disable persisted queries
		persistedQueries: false,
		formatError,

		// By default, the GraphQL Playground interface and GraphQL introspection
		// is disabled in "production" (i.e. when `process.env.NODE_ENV` is `production`).
		//
		// If you'd like to have GraphQL Playground and introspection enabled in production,
		// install the Playground plugin and set the `introspection` option explicitly to `true`.
		// introspection: true,
		plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
		context: contextBuilder,
	});

	return server.createHandler<
		E & { httpMethod: string },
		APIGatewayProxyStructuredResultV2
	>({
		expressGetMiddlewareOptions: {
			cors: {
				origin: '*',
				credentials: true,
			},
		},
	}) as (
		evt: E & { httpMethod: string },
		ctx: C,
		callback: (err: unknown, res: unknown) => void,
	) => Promise<APIGatewayProxyStructuredResultV2>;
}

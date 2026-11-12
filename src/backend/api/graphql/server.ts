import type { BaseContext } from '@apollo/server';
import {
	type ContextBuilder,
	createApolloServer,
	type GraphqlLambdaHandler,
	toLambdaHandler,
} from './apollo-lambda';
import { globalSchema } from './schema';

let cachedHandler: Promise<GraphqlLambdaHandler<unknown>> | undefined;

/**
 * Returns the GraphQL handler for the application schema. The server is
 * created once per process and reused for later requests.
 */
export async function getGraphQLServer<C, Ctx extends BaseContext>(
	contextBuilder: ContextBuilder<C, Ctx>,
): Promise<GraphqlLambdaHandler<C>> {
	if (!cachedHandler) {
		cachedHandler = globalSchema.then(
			(schema) =>
				toLambdaHandler(
					createApolloServer<Ctx>(schema),
					contextBuilder,
				) as GraphqlLambdaHandler<unknown>,
		);
		cachedHandler.catch(() => {
			cachedHandler = undefined;
		});
	}
	return cachedHandler as Promise<GraphqlLambdaHandler<C>>;
}

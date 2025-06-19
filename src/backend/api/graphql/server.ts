import { ApolloServer } from 'apollo-server-lambda';
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';
import { ValidationError } from 'class-validator';
import chalk from 'chalk';
import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { trace } from '@opentelemetry/api';

import { globalSchema } from '.';

import { Logger } from '@/backend/services/logger.service';

const tracer = trace.getTracer('graphql');

const logger = new Logger('GraphQLServer');

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
		// TODO handle caching:
		// import { InMemoryLRUCache } from '@apollo/utils.keyvaluecache';
		// { cache: new InMemoryLRUCache() }
		// if we are not serverless
		// for now, we just disable persisted queries
		persistedQueries: false,
		formatError: (error) => {
			if (
				error.extensions.exception.stacktrace[0].includes(
					'Session Expired - Refreshable',
				)
			) {
				return {
					message: 'Session Expired - Refreshable',
					extensions: {
						code: 'SESSION_EXPIRED_REFRESHABLE',
					},
				};
			}

			return tracer.startActiveSpan('formatError', (span) => {
				logger.warn('Error');
				const { code, exception } = (error?.extensions || {
					code: 'UNKNOWN',
					exception: {},
				}) as {
					code: string;
					exception: {
						validationErrors: ValidationError[];
						stacktrace: string[];
					};
				};

				span.setAttribute('code', code);

				logger.warn('GraphQL Error', {
					error,
					code,
					nodeEnv: process.env.NODE_ENV,
				});

				if (exception.validationErrors) {
					const message = `Input Data Validation Failed\n${exception.validationErrors
						.map(
							(e) =>
								`- ${e.target?.constructor?.name} ${e.constraints?.[
									Object.keys(e.constraints)[0]
								]} (${`${e.value?.toString?.()}`.slice(0, 10)}...) }`,
						)
						.join('\n')}
				`;

					if (process.env.NODE_ENV !== 'production') {
						// eslint-disable-next-line no-console
						console.log(chalk.yellow(message));
					}

					span.setAttribute('type', 'VALIDATION_ERROR');
					span.end();
					return {
						message,
						locations: error.locations,
						path: error.path,
					};
				} else if (code === 'INTERNAL_SERVER_ERROR') {
					if (process.env.NODE_ENV !== 'production') {
						// eslint-disable-next-line no-console
						console.log(
							chalk.red(error.extensions.exception.stacktrace.join('\n')),
						);
					}
					span.setAttribute('type', 'INTERNAL_SERVER_ERROR');
					span.end();
					throw new Error('Internal server error');
				}
				span.end();
				return error;
			});
		},

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

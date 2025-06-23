import { ApolloServer } from 'apollo-server-lambda';
import { buildSchema, NonEmptyArray } from 'type-graphql';
import type {
	APIGatewayEventRequestContextV2,
	APIGatewayProxyEventV2,
	Context,
} from 'aws-lambda';
import { ExecutionResult } from 'graphql';

import { getConfigForRelationalDb } from './create-config';

import '@/backend/repositories';

import { GRAPHQL_TEST_SET } from '@/backend/api/graphql/di-tokens';
import { CONFIG_SERVICE } from '@/backend/services/di-tokens';
import { App } from '@/common/di';
import { RelationalDbService } from '@/backend/services/relationaldb.service';
import { RELATIONAL_REPOSITORY_TEST_SET } from '@/backend/repositories/di-tokens';
import { FILE_STORAGE_LOCAL_TEST_SET } from '@/backend/services/file-storage.service/di-tokens';
import { Session, SessionLambdaContext } from '@/backend/api/session';
import { contextBuilder } from '@/backend/api/graphql/handler';
import { authChecker } from '@/backend/api/graphql/authorizer';

export type ExecuteTestFunction = (options: {
	source: string;
	variableValues?: Record<string, unknown>;
	contextValue?: {
		authenticated: boolean;
		session: Session;
	};
}) => Promise<ExecutionResult>;

/**
 * Prepares a test environment for GraphQL e2e tests.
 */
export async function prepareGraphqlTest() {
	const config = getConfigForRelationalDb();

	const app = App.forRoot({
		modules: [
			{ token: CONFIG_SERVICE, value: config },
			{ token: RelationalDbService, module: RelationalDbService },
			...App.testSets[RELATIONAL_REPOSITORY_TEST_SET],
			...App.testSets[FILE_STORAGE_LOCAL_TEST_SET],
		],
	});

	// Initialize database and synchronize schema
	const dbService = app.get(RelationalDbService);
	await dbService.initialize();
	await dbService.dataSource.synchronize(true); // this wipes the DB

	const resolvers = App.testSets[GRAPHQL_TEST_SET].map(
		// eslint-disable-next-line @typescript-eslint/ban-types
		(r) => r.module as Function,
	);

	// Build GraphQL schema
	const schema = await buildSchema({
		// eslint-disable-next-line @typescript-eslint/ban-types
		resolvers: resolvers as NonEmptyArray<Function>,
		container: app,
		authChecker,
	});

	const server = new ApolloServer({
		schema,
		persistedQueries: false,
		formatError: (error) => {
			console.log(error);
			return error;
		},
		context: contextBuilder,
	});

	const execute: ExecuteTestFunction = async ({
		source,
		variableValues,
		contextValue,
	}) => {
		const session =
			contextValue?.session || (contextValue?.authenticated ?? true)
				? new Session({
						userId: 'test-user',
						email: 'test@example.com',
						name: 'Test User',
						roles: ['user'],
					})
				: null;

		const gqlHandler = server.createHandler();

		const ctx = {
			done: () => {},
			fail: () => {},
			succeed: () => {},
			getRemainingTimeInMillis: () => 30000,
			functionName: 'test-function',
			functionVersion: 'test-version',
			identity: {
				user: session,
				refreshable: false,
			},
		} satisfies Partial<SessionLambdaContext> as unknown as Context;

		const event = {
			routeKey: 'local',
			rawPath: '/api/graphql',
			rawQueryString: '',
			headers: {
				'content-type': 'application/json',
			},
			cookies: [],
			isBase64Encoded: false,
			queryStringParameters: {},
			pathParameters: {},
			body: JSON.stringify({ query: source, variables: variableValues }),
			requestContext: {
				accountId: 'test-account',
				apiId: 'test-api-id',
				domainName: 'test-domain-name',
				domainPrefix: 'test-domain-prefix',
				requestId: 'test-request-id',
				time: new Date().toISOString(),
				timeEpoch: Date.now(),
				http: {
					method: 'POST',
					path: '/api/graphql',
					protocol: 'HTTP/1.1',
					sourceIp: '127.0.0.1',
					userAgent: 'test-user-agent',
				},
			} satisfies Partial<APIGatewayEventRequestContextV2> as unknown as APIGatewayEventRequestContextV2,
		} satisfies Partial<APIGatewayProxyEventV2> as unknown as APIGatewayProxyEventV2;

		const answer = await gqlHandler(event, ctx, () => {});

		return answer;
	};

	return {
		schema,
		app,
		execute,
	};
}

/* eslint-disable import/no-extraneous-dependencies */
import { randomUUID } from 'node:crypto';

import { vi } from 'vitest';
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

import * as resolvers from '@/backend/api/graphql/index';
import { App, DEFAULT_TEST_SET, DefaultContainer } from '@/common/di';
import { GRAPHQL_TEST_SET } from '@/backend/api/graphql/di-tokens';
import {
	CONFIG_SERVICE,
	RELATIONALDB_SERVICE,
	EVENTBUS_SERVICE,
} from '@/backend/services/di-tokens';
import { RelationalDbService } from '@/backend/services/relationaldb.service';
import { RELATIONAL_REPOSITORY_TEST_SET } from '@/backend/repositories/di-tokens';
import { FILE_STORAGE_LOCAL_TEST_SET } from '@/backend/services/file-storage.service/di-tokens';
import { Session, SessionLambdaContext } from '@/backend/api/session';
import { contextBuilder } from '@/backend/api/graphql/context-builder';
import { authChecker } from '@/backend/api/graphql/authorizer';

export type ExecuteTestFunction = (options: {
	source: string;
	variableValues?: Record<string, unknown>;
	contextValue?: {
		authenticated: boolean;
		session?: Session;
	};
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
}) => Promise<ExecutionResult | { errors: string[]; data?: any }>;

if (DefaultContainer.isBound(CONFIG_SERVICE)) {
	DefaultContainer.unbind(CONFIG_SERVICE);
}

/**
 * Prepares a test environment for GraphQL e2e tests.
 *
 * This function also injects a mocked EventBusService into the DI container, allowing tests
 * to inspect and assert which events are sent via the event bus. The mock is returned as part
 * of the result, and replaces any previously registered EventBusService.
 */
export async function prepareGraphqlTest() {
	const config = getConfigForRelationalDb();

	// --- Mock EventBusService ---
	const eventBusMock = {
		send: vi.fn().mockImplementation(() => Promise.resolve(randomUUID())),
	};

	const app = App.forRoot({
		modules: [
			{ token: CONFIG_SERVICE, value: config },
			// Register the mock EventBusService for all code under test
			...App.testSets[DEFAULT_TEST_SET],
			...App.testSets[RELATIONAL_REPOSITORY_TEST_SET],
			...App.testSets[FILE_STORAGE_LOCAL_TEST_SET],
			...App.testSets[GRAPHQL_TEST_SET],
		],
	});

	// Unbind any existing EventBusService to ensure the mock is used
	if (app.isBound(EVENTBUS_SERVICE)) {
		app.unbind(EVENTBUS_SERVICE);
	}
	app.bind(EVENTBUS_SERVICE, { value: eventBusMock });

	// Initialize database and synchronize schema
	const dbService = app.get<RelationalDbService>(RELATIONALDB_SERVICE);
	await dbService.initialize();
	await dbService.dataSource.synchronize(true); // this wipes the DB

	// Build GraphQL schema
	const schema = await buildSchema({
		// eslint-disable-next-line @typescript-eslint/ban-types
		resolvers: Object.values(resolvers) as unknown as NonEmptyArray<Function>,
		container: app,
		authChecker,
		// 'validate: true' enables class-transformer for input types in type-graphql
		validate: true,
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
		const cb = vi.fn();
		const ctx = {
			callbackWaitsForEmptyEventLoop: false,
			functionName: '/api/graphql',
			functionVersion: 'local',
			invokedFunctionArn: 'arn:aws:lambda:local',
			memoryLimitInMB: '512',
			awsRequestId: randomUUID(),
			logGroupName: 'local',
			logStreamName: 'local',
			getRemainingTimeInMillis: () => 10000,
			done: cb,
			fail: cb,
			succeed: (messageOrObject: unknown) => cb(undefined, messageOrObject),
			identity: {
				user: session,
				refreshable: false,
			},
		} satisfies Partial<SessionLambdaContext> as unknown as Context;
		const body = JSON.stringify({ query: source, variables: variableValues });
		const event = {
			httpMethod: 'POST',
			version: '1.0',
			routeKey: 'local',
			path: '/api/graphql',
			rawPath: '/api/graphql',
			rawQueryString: '',
			headers: {
				'content-type': 'application/json',
			},
			cookies: [],
			queryStringParameters: {},
			body,
			pathParameters: {},
			isBase64Encoded: false,
			stageVariables: undefined,
			requestContext: {
				accountId: 'test-account',
				apiId: 'test-api-id',
				domainName: 'localhost:3000',
				domainPrefix: '',
				requestId: randomUUID(),
				routeKey: 'local',
				stage: 'local',
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
		} satisfies Partial<APIGatewayProxyEventV2> & {
			path: string;
			httpMethod: string;
		} as unknown as APIGatewayProxyEventV2;
		const answer = await gqlHandler(event, ctx, () => {});

		try {
			return JSON.parse(answer.body as string) as ExecutionResult;
		} catch {
			return { errors: [answer.body as string] };
		}
	};

	return {
		schema,
		app,
		execute,
		eventBusMock,
	};
}

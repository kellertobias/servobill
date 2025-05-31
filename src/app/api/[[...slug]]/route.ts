import 'reflect-metadata';

/* eslint-disable unicorn/no-for-loop */
import { randomUUID } from 'crypto';
import { type NextRequest } from 'next/server';

import {
	APIGatewayProxyEventV2,
	APIGatewayProxyStructuredResultV2,
	Context,
} from 'aws-lambda';
import chalk from 'chalk';

import apiEndpoints from '@/backend/api';
import { Handler, HttpVerb } from '@/common/api-types';

export const dynamic = 'force-dynamic'; // defaults to auto

// Load all handlers dynamically

function findApiPath(
	apiPaths: string[],
	path: string[],
): { resolvedPath: string; pathParameters: Record<string, string> } | null {
	for (const apiPathRaw of apiPaths) {
		const apiPath = apiPathRaw.split('/').filter((x) => x.trim());
		if (path.length !== apiPath.length) {
			continue;
		}

		const resolvedPath: string[] = [];
		const pathParameters: Record<string, string> = {};
		let match = true;
		for (let i = 0; i < apiPath.length; i++) {
			const apiPathPart = apiPath[i];
			const pathPart = path[i];
			if (apiPathPart.startsWith('[') && apiPathPart.endsWith(']')) {
				const paramName = apiPathPart.slice(1, -1);
				resolvedPath.push(apiPathPart);
				pathParameters[paramName] = pathPart;
				continue;
			} else if (apiPathPart === pathPart) {
				resolvedPath.push(apiPathPart);
			} else {
				match = false;
				break;
			}
		}
		if (match) {
			return {
				resolvedPath: '/' + resolvedPath.join('/'),
				pathParameters,
			};
		}
	}

	return null;
}

function getHandler(
	path: string[],
	method: HttpVerb,
): {
	load: Handler;
	path: string[];
	pathParameters: Record<string, string>;
} | null {
	const relevantApiEndpoints = apiEndpoints[method] || {};
	const apiPaths = Object.keys(relevantApiEndpoints);
	const result = findApiPath(apiPaths, path);
	if (!result) {
		if (method !== 'ANY') {
			return getHandler(path, 'ANY');
		}
		return null;
	}

	return {
		load: relevantApiEndpoints[result.resolvedPath],
		path: result.resolvedPath.split('/'),
		pathParameters: result.pathParameters,
	};
}

const nextToLambdaRequest = async (
	request: NextRequest,
	body: string,
	pathParameters: Record<string, string>,
): Promise<APIGatewayProxyEventV2 & { path: string }> => {
	const headers = Object.fromEntries(request.headers.entries());
	const queryStringParameters = Object.fromEntries(
		request.nextUrl.searchParams.entries(),
	);
	const cookies = headers['cookie'] as unknown as string[];

	return {
		version: '1.0',
		routeKey: 'local',
		path: request.nextUrl.pathname,
		rawPath: request.nextUrl.pathname,
		rawQueryString: request.nextUrl.search || '',
		headers: headers,
		cookies: Array.isArray(cookies) ? cookies : `${cookies}`.split(','),
		queryStringParameters,
		body,
		pathParameters,
		isBase64Encoded: false,
		stageVariables: undefined,
		requestContext: {
			accountId: 'local',
			apiId: 'local',
			domainName: 'localhost:3000',
			domainPrefix: '',
			requestId: randomUUID().toString(),
			routeKey: 'local',
			stage: 'local',
			time: new Date().toISOString(),
			timeEpoch: Date.now(),
			http: {
				method: request.method,
				path: request.nextUrl.pathname,
				protocol: 'HTTP/1.1',
				sourceIp: request.ip || '127.0.0.42',
				userAgent: request.headers.get('user-agent') || '',
			},
		},
	};
};

const makeLambdaContext = (
	path: string,
	cb: (err?: Error | string, res?: unknown) => void,
): Context => {
	return {
		callbackWaitsForEmptyEventLoop: false,
		functionName: path,
		functionVersion: 'local',
		invokedFunctionArn: 'arn:aws:lambda:local',
		memoryLimitInMB: '512',
		awsRequestId: randomUUID().toString(),
		logGroupName: 'local',
		logStreamName: 'local',
		getRemainingTimeInMillis: () => 10000,
		done: cb,
		fail: cb,
		succeed: (messageOrObject: unknown) => cb(undefined, messageOrObject),
	};
};

const makePromisedCallback = (): {
	promise: Promise<unknown>;
	callback: (err?: Error | string | null, res?: unknown) => void;
} => {
	const promiseCallbacks: {
		resolve?: (value: unknown) => void;
		reject?: (reason?: string | Error) => void;
	} = {};
	const promise = new Promise<unknown>((resolve, reject) => {
		promiseCallbacks.resolve = resolve;
		promiseCallbacks.reject = reject;
	});

	return {
		promise,
		callback: (err?: Error | string | null, res?: unknown) => {
			if (err) {
				promiseCallbacks.reject?.(err);
			} else {
				promiseCallbacks.resolve?.(res);
			}
		},
	};
};

function tryParseJSON(json: string) {
	try {
		return JSON.parse(json);
	} catch {
		return null;
	}
}

function getGraphQlQueryName(
	json: {
		operationName?: string;
		query?: string;
		variables?: Record<string, unknown>;
	} | null,
) {
	if (!json) {
		return null;
	}
	if (json.operationName) {
		return json.operationName;
	}
	const query = json.query;
	const match = query?.match(/(query|mutation)\s+(\w+)/);
	if (match) {
		return `${match[1]} ${match[2]}`;
	}

	const match2 = query?.match(/(query|mutation)/);
	if (match2) {
		return `${match2[1]} ${
			match2[1] === 'query' ? 'UnnamedQuery' : 'UnnamedMutation'
		}`;
	}
	if (
		json.operationName !== undefined &&
		json.variables !== undefined &&
		json.query !== undefined
	) {
		return 'query UnnamedQuery';
	}
	return null;
}

async function ALL(
	request: NextRequest,
	params: {
		params: { slug: string[] };
		method: HttpVerb;
	},
) {
	const path = ['api', ...params.params.slug];
	const handler = getHandler(path, params.method);
	if (!handler) {
		// eslint-disable-next-line no-console
		console.error('Not found', path, params.method, apiEndpoints);
		return new Response('Not found', { status: 404 });
	}

	const body = await request.text();
	const json = tryParseJSON(body);
	if (!json || json.operationName !== 'IntrospectionQuery') {
		// eslint-disable-next-line no-console
		console.log(
			chalk.green.bold(' ►'),
			`[${params.method}] /${path.join('/')} ${
				getGraphQlQueryName(json) || ''
			}`,
		);
	}

	const lambdaRequest = await nextToLambdaRequest(
		request,
		body,
		handler.pathParameters,
	);

	const { callback } = makePromisedCallback();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const lambdaContext = makeLambdaContext(path.join('/'), callback as any);
	const execute = await handler.load();
	try {
		const result = await execute(lambdaRequest, lambdaContext, callback);
		if (!result) {
			// eslint-disable-next-line no-console
			console.error('No result - Callbacks are not supported', result);
			return new Response(JSON.stringify({ error: 'no callbacks please!' }), {
				status: 500,
			});
		}

		if (!result) {
			return new Response(JSON.stringify({ error: 'No result' }), {
				status: 500,
			});
		}

		if (typeof result === 'string') {
			return new Response(result, {
				status: 200,
			});
		}

		const structuredResult = result as APIGatewayProxyStructuredResultV2;

		return new Response(structuredResult.body, {
			status: structuredResult.statusCode,
			headers: {
				...structuredResult.headers,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				...(structuredResult as any).multiValueHeaders,
				...(structuredResult.cookies
					? { 'Set-Cookie': structuredResult.cookies.join(', ') }
					: {}),
			},
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Error', error);
		return new Response(JSON.stringify({ error: String(error) }), {
			status: 500,
		});
	}
}

export async function GET(
	request: NextRequest,
	{
		params,
	}: {
		params: { slug: string[] };
	},
) {
	return ALL(request, { params, method: 'GET' });
}

export async function HEAD(
	request: NextRequest,
	{ params }: { params: { slug: string[] } },
) {
	return ALL(request, { params, method: 'HEAD' });
}

export async function POST(
	request: NextRequest,
	{ params }: { params: { slug: string[] } },
) {
	return ALL(request, { params, method: 'POST' });
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: { slug: string[] } },
) {
	return ALL(request, { params, method: 'PUT' });
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: { slug: string[] } },
) {
	return ALL(request, { params, method: 'DELETE' });
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: { slug: string[] } },
) {
	return ALL(request, { params, method: 'PATCH' });
}

// If `OPTIONS` is not defined, Next.js will automatically implement `OPTIONS` and  set the appropriate Response `Allow` header depending on the other methods defined in the route handler.
export async function OPTIONS(
	request: NextRequest,
	{ params }: { params: { slug: string[] } },
) {
	return ALL(request, { params, method: 'OPTIONS' });
}

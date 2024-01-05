import path from 'path';

import * as lambda from 'aws-cdk-lib/aws-lambda';
import esbuildPluginTsc from 'esbuild-plugin-tsc';
import {
	Api,
	ApiAuthorizer,
	ApiFunctionRouteProps,
	ApiProps,
	StackContext,
} from 'sst/constructs';

import { apiEndpoints } from './build-index';
import { makeLogGroup } from './log-group';

export function StackApi(
	{ stack }: StackContext,
	baseLayers: lambda.ILayerVersion[],
	layerCache: Record<string, lambda.LayerVersion>,
	props?: Omit<ApiProps<Record<string, ApiAuthorizer>, string>, 'routes'> & {
		environment?: Record<string, string>;
	},
) {
	// API handlers are in src/api and are deployed to /api
	// the folder path is the route and the file name
	// is the HTTP method

	// Example:
	// src/api/graphql/get.ts => GET /api/graphql
	const endpoints: Record<string, ApiFunctionRouteProps> = {};
	for (const endpoint of apiEndpoints) {
		endpoints[
			`${endpoint.method} ${endpoint.path
				.split('[')
				.join('{')
				.split(']')
				.join('}')}`
		] = {
			function: {
				handler: `${endpoint.file}.${endpoint.handler}`,
				layers: [
					...baseLayers,
					...(endpoint.layers || []).map((layerPath) => layerCache[layerPath]),
				],
				logGroup: makeLogGroup(stack, [endpoint.method, endpoint.path]),
			},
		};
	}
	const { environment, ...rootProps } = props || {};
	return new Api(stack, 'api', {
		...rootProps,
		defaults: {
			function: {
				environment,
				runtime: 'nodejs20.x',
				nodejs: {
					format: 'cjs',
					esbuild: {
						plugins: [
							esbuildPluginTsc({
								tsconfigPath: path.resolve('tsconfig.json'),
							}),
						],
					},
					// splitting: true,
					install: ['graphql', 'graphql-tools', 'type-graphql'],
				},
			},
		},
		routes: endpoints,
	});
}

import fs from 'fs';

import * as lambda from 'aws-cdk-lib/aws-lambda';
import {
	Api,
	ApiAuthorizer,
	ApiFunctionRouteProps,
	ApiProps,
	FunctionProps,
	StackContext,
} from 'sst/constructs';

import { makeLogGroup } from './log-group';
import { ApiEndpoint } from './build-index/api';

export function StackApi(
	{ stack }: StackContext,
	baseLayers: lambda.ILayerVersion[],
	layerCache: Record<string, lambda.LayerVersion>,
	apiEndpoints: ApiEndpoint[],
	props?: Omit<ApiProps<Record<string, ApiAuthorizer>, string>, 'routes'> & {
		function?: FunctionProps;
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

		fs.writeFileSync(
			endpoint.file,
			`${fs.readFileSync(endpoint.file)}
// Automatically Added. Do not commit this change.
// This export is required because of a bug in OpenTelemetry
// eslint-disable-next-line unicorn/prefer-module
module.exports = { ${endpoint.handler} };
		`,
		);
	}

	const { function: functionDefiniton, ...rootProps } = props || {};
	return new Api(stack, 'api', {
		...rootProps,
		defaults: {
			function: functionDefiniton,
		},
		routes: endpoints,
	});
}

/* eslint-disable no-console */
import path from 'path';

import esbuildPluginTsc from 'esbuild-plugin-tsc';
import {
	NextjsSite,
	Permissions,
	EventBus,
	StackContext,
} from 'sst/constructs';
import './load-environ';

import { StackApi } from './api';
import { eventHandlerEndpoints, apiEndpoints } from './build-index';
import { makeLogGroup } from './log-group';
import { makeOtelConfig, otelBaseConfig } from './otel';
import { getDomainConfig } from './domain';
import { prepareNextBuild, restoreAfterNextBuild } from './build-prep';
import { getDataResources } from './data';
import { getCleanEnvironment } from './helpers';
import { getLayers } from './layers';

export function Stack({ stack, ...rest }: StackContext) {
	const openTelemetry = makeOtelConfig();
	const copyFiles = [openTelemetry].filter((x) => x !== null) as {
		from: string;
	}[];
	const domain = getDomainConfig({ stack, ...rest });
	const { tables, buckets } = getDataResources({ stack, ...rest });
	const { baseLayers, layerCache } = getLayers({
		stack,
		...rest,
		openTelemetry,
	});

	prepareNextBuild();
	const site = new NextjsSite(stack, 'site', {
		bind: [buckets.files],
		customDomain: domain.siteCustomDomain,
		environment: {
			NEXT_PUBLIC_API_URL: domain.publicApiUrl,
		},
	});
	restoreAfterNextBuild();

	const baseBinds = [buckets.files, tables.electrodb];
	const baseEnvironment = getCleanEnvironment({
		...otelBaseConfig,
		JWT_SECRET: [process.env.JWT_SECRET],
		ALLOWED_EMAILS: [process.env.ALLOWED_EMAILS],
		OAUTH_CLIENT_ID: [process.env.OAUTH_CLIENT_ID],
		TABLE_ELECTRODB: tables.electrodb.tableName,
		SITE_DOMAIN: domain.siteDomain,
		BUCKET_FILES: buckets.files.bucketName,

		SERVICE_NAMESPACE: 'servobill',
		NODE_OPTIONS: '--enable-source-maps',
	});

	const bus = new EventBus(stack, 'bus', {
		defaults: {
			retries: 5,
			function: {
				copyFiles,
				environment: {
					...baseEnvironment,
				},
				permissions: [...baseBinds],
				nodejs: {
					format: 'cjs',
					esbuild: {
						external: ['@sparticuz/chromium'],
					},
				},
				runtime: 'nodejs16.x',
				timeout: 60 * 5, // 5 minutes
				memorySize: 1024,
			},
		},
	});

	for (const endpoint of eventHandlerEndpoints) {
		bus.addRules(stack, {
			[`rule${endpoint.eventType
				.split('.')
				.map((namePart) => {
					// ucfirst
					return namePart[0].toUpperCase() + namePart.slice(1);
				})
				.join('')}`]: {
				pattern: { detailType: [endpoint.eventType] },
				targets: {
					handler: {
						function: {
							handler: `${endpoint.file}.${endpoint.handler}`,
							layers: [
								...baseLayers,
								...(endpoint.layers || []).map(
									(layerPath) => layerCache[layerPath],
								),
							],
							logGroup: makeLogGroup(stack, [
								'eventhandler',
								endpoint.eventType,
							]),
						},
					},
				},
			},
		});
	}

	const api = StackApi(
		{ stack, ...rest },
		baseLayers,
		layerCache,
		apiEndpoints,
		{
			customDomain: domain.apiCustomDomain,
			cors: {
				allowOrigins: site.customDomainUrl
					? [site.customDomainUrl]
					: [site.url!],
				allowMethods: ['ANY'],
				allowHeaders: [
					'Content-Type',
					'Authorization',
					'Apollo-Require-Preflight',
					'Content-Length',
					'Cookie',
				],
				allowCredentials: true,
			},
			function: {
				copyFiles,
				environment: {
					...baseEnvironment,
					EVENT_BUS_NAME: bus.eventBusName,
				},
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
	);

	api.bind([...baseBinds]);
	api.bind([bus]);

	const permissions: Permissions = ['s3', 'ses'];
	api.attachPermissions(permissions);
	bus.attachPermissions(permissions);

	// stack.addOutputs({
	// 	SiteUrl: site.url,
	// 	SiteCustomUrl: site.customDomainUrl,
	// 	ApiUrl: api.url,
	// 	ApiCustomUrl: api.customDomainUrl,
	// });
}

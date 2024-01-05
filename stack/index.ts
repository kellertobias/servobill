/* eslint-disable no-console */
import fs from 'fs';

import * as lambda from 'aws-cdk-lib/aws-lambda';
import { config } from 'dotenv';
import {
	NextjsSite,
	Permissions,
	Bucket,
	EventBus,
	StackContext,
	Table,
} from 'sst/constructs';
import { HostedZone } from 'aws-cdk-lib/aws-route53';

import { StackApi } from './api';
import { tableDefinitions } from './local/initialize/definitions/tables';
import { eventHandlerEndpoints, apiEndpoints } from './build-index';
import { makeLogGroup } from './log-group';

config();

// Move src/app/api to src/app/_ignore_api
const apiDir = 'src/app/api';
const ignoreApiDir = '_ignore_api';
const tsconfigNext = 'tsconfig.json';
let tsconfigOriginal: string | undefined;

const prepareNextBuild = () => {
	console.log('[NextJS] Preparing Build');
	if (fs.existsSync(apiDir)) {
		fs.renameSync(apiDir, ignoreApiDir);
	}
	const currentTsConfigRaw = fs.readFileSync(tsconfigNext, 'utf8');
	tsconfigOriginal = currentTsConfigRaw;
	const tsConfig = JSON.parse(currentTsConfigRaw);
	tsConfig.include = [
		'next-env.d.ts',
		'src/app/**/*.ts',
		'src/app/**/*.tsx',
		'src/common/**/*.ts',
		'src/common/**/*.tsx',
		'.next/types/**/*.ts',
	];
	tsConfig.exclude = [
		...tsConfig.exclude,
		`${ignoreApiDir}/**/*`,
		'src/app/backend/**/*',
	];

	fs.writeFileSync(tsconfigNext, JSON.stringify(tsConfig, null, 2));
};

const restoreAfterNextBuild = () => {
	console.log('[NextJS] Restoring After Build');
	if (fs.existsSync(ignoreApiDir)) {
		fs.renameSync(ignoreApiDir, apiDir);
	}
	if (tsconfigOriginal) {
		fs.writeFileSync(tsconfigNext, tsconfigOriginal);
	}
};

export function makeTables(stack: StackContext['stack']) {
	const tables = {} as Record<keyof typeof tableDefinitions, Table>;

	for (const [tableName, tableDefinition] of Object.entries(tableDefinitions)) {
		const table = new Table(stack, tableName, {
			fields: tableDefinition.fields,
			primaryIndex: tableDefinition.primaryIndex,
			globalIndexes: tableDefinition.globalIndexes,
		});
		tables[tableName as keyof typeof tableDefinitions] = table;
	}

	return tables;
}

export function Stack({ stack, ...rest }: StackContext) {
	const hostedZone = HostedZone.fromLookup(stack, 'HostedZone', {
		domainName: process.env.HOSTED_ZONE_DOMAIN_NAME!,
	});
	const files = new Bucket(stack, 'files', {
		cors: true,
		...(process.env.BUCKETS_FILE_SST
			? {
					name: process.env.BUCKETS_FILE_SST,
				}
			: {}),
	});

	const tables = makeTables(stack);

	// Prepare
	prepareNextBuild();
	const site = new NextjsSite(stack, 'site', {
		bind: [files],
		customDomain: {
			domainName: process.env.SITE_DOMAIN!,
			cdk: {
				hostedZone,
			},
		},
		environment: {
			NEXT_PUBLIC_API_URL: `https://api.${process.env.SITE_DOMAIN!}`,
		},
	});
	restoreAfterNextBuild();

	const baseBinds = [files, tables.electrodb];
	const baseEnvironment = {
		JWT_SECRET: process.env.JWT_SECRET!,
		ALLOWED_EMAILS: process.env.ALLOWED_EMAILS!,
		OAUTH_CLIENT_ID: process.env.OAUTH_CLIENT_ID!,
		TABLE_ELECTRODB: tables.electrodb.tableName,
		SITE_DOMAIN: process.env.SITE_DOMAIN!,
		BUCKET_FILES: files.bucketName,
	};

	const layerCache: Record<string, lambda.LayerVersion> = {};
	const layers = [
		...new Set(
			[...eventHandlerEndpoints, ...apiEndpoints].flatMap(
				({ layers }) => layers || [],
			),
		).values(),
	];
	for (const layerPath of layers) {
		const logicalId = layerPath.replaceAll(/\W/g, '');
		console.log(`[Layer] ${layerPath} - ${logicalId}`);
		layerCache[layerPath] = new lambda.LayerVersion(stack, logicalId, {
			code: lambda.Code.fromAsset(layerPath),
		});
	}

	const baseLayers = [
		lambda.LayerVersion.fromLayerVersionArn(
			stack,
			'LayerOtel',
			'arn:aws:lambda:eu-central-1:184161586896:layer:opentelemetry-collector-amd64-0_3_1:1',
		),
	];

	const bus = new EventBus(stack, 'bus', {
		defaults: {
			retries: 5,
			function: {
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

	const api = StackApi({ stack, ...rest }, baseLayers, layerCache, {
		customDomain: {
			domainName: `api.${process.env.SITE_DOMAIN!}`,
			cdk: {
				hostedZone,
			},
		},
		cors: {
			allowOrigins: site.customDomainUrl ? [site.customDomainUrl] : [site.url!],
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
		environment: {
			...baseEnvironment,
			EVENT_BUS_NAME: bus.eventBusName,
		},
	});

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

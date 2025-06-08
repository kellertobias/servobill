/// <reference path="./.sst/platform/config.d.ts" />

import path from 'node:path';
import { config } from 'dotenv';

import * as pulumi from '@pulumi/pulumi';
import esbuildPluginTsc from 'esbuild-plugin-tsc';

import type { Output } from '@pulumi/pulumi';
import type { Input } from './.sst/platform/src/components/input';

import type { ApiEndpoint } from './stack/build-index/api';
import type { EventEndpoint } from './stack/build-index/events';

import { apiEndpoints, eventHandlerEndpoints } from './stack/build-index';
import { tableDefinitions } from './stack/local/initialize/definitions/tables';

config();

const npm = {
	api: {
		install: ['graphql', 'graphql-tools', 'type-graphql', 'pg', 'sharp'],
		external: ['aws-sdk', 'pg-native', 'sharp'],
	},
};

const defaultPermissions = [
	{
		actions: ['s3:GetObject'],
		resources: ['*'],
	},
	{
		actions: ['s3:PutObject', 's3:PutObjectAcl'],
		resources: ['*'],
	},
	{
		actions: ['secretsmanager:GetSecretValue'],
		resources: ['*'],
	},
];

type GetFunctionOptions = {
	environment?: Record<string, Input<string>>;
	layers?: (string | Output<string>)[];
	link?: sst.aws.FunctionArgs['link'];
	npmInstall?: string[];
	npmExternal?: string[];
	timeout?: number;
	memorySize?: number;
};

const getFunction = (
	endpoint: ApiEndpoint | EventEndpoint,
	options?: GetFunctionOptions,
): sst.aws.FunctionArgs => {
	const descriptionPrefix = endpoint.method
		? `${endpoint.method} `
		: `Event ${endpoint.eventType} `;

	return {
		handler: `${endpoint.file}.${endpoint.handler}`,
		description: `${descriptionPrefix} ${endpoint.path}`,
		permissions: defaultPermissions,
		runtime: 'nodejs20.x',
		layers: options?.layers,
		environment: {
			...options?.environment,
			SITE_DOMAIN: process.env.SITE_DOMAIN!,
			NODE_OPTIONS: '--enable-source-maps',
		},
		timeout: `${options?.timeout ?? 60} seconds`,
		memory: `${options?.memorySize ?? 1024} MB`,
		link: options?.link,
		nodejs: {
			format: 'cjs',
			esbuild: {
				plugins: [
					esbuildPluginTsc({
						tsconfigPath: path.resolve('tsconfig.json'),
					}),
				],
				external: options?.npmExternal,
			},
			install: options?.npmInstall,
		},
	};
};

const getApiFunction = (
	endpoint: ApiEndpoint,
	options?: GetFunctionOptions,
): [string, sst.aws.FunctionArgs] => {
	const apiPath = endpoint.path.split('[').join('{').split(']').join('}');

	return [`${endpoint.method} ${apiPath}`, getFunction(endpoint, options)];
};

const getEventFunction = (
	endpoint: EventEndpoint,
	options?: GetFunctionOptions,
): [string, sst.aws.FunctionArgs, sst.aws.BusSubscriberArgs] => {
	const eventType = endpoint.eventType
		.split('.')
		.map((namePart) => {
			// ucfirst
			return namePart[0].toUpperCase() + namePart.slice(1);
		})
		.join('');

	return [
		`Event${eventType}`,
		getFunction(endpoint, options),
		{
			pattern: {
				detailType: [endpoint.eventType],
			},
		},
	];
};

export default $config({
	app(input) {
		return {
			name: 'servobill',
			removal: input?.stage === 'production' ? 'retain' : 'remove',
			home: 'aws',
			protect: ['production'].includes(input?.stage),
			providers: {
				aws: {
					region: 'eu-central-1',
					profile: process.env.AWS_PROFILE,
				},
			},
		};
	},
	async run() {
		// ===============================
		// Create Resources:
		// ===============================
		const table = new sst.aws.Dynamo(`ServobillDataTable`, {
			fields: tableDefinitions.electrodb.fields,
			primaryIndex: {
				hashKey: tableDefinitions.electrodb.primaryIndex.partitionKey,
				rangeKey: tableDefinitions.electrodb.primaryIndex.sortKey,
			},
			globalIndexes: {
				'gsi1pk-gsi1sk-index': {
					hashKey:
						tableDefinitions.electrodb.globalIndexes['gsi1pk-gsi1sk-index']
							.partitionKey,
					rangeKey:
						tableDefinitions.electrodb.globalIndexes['gsi1pk-gsi1sk-index']
							.sortKey,
				},
			},
		});

		// Create SES Email Identity
		const email = new sst.aws.Email('ServobillEmail', {
			sender: process.env.EMAIL_SENDER_DOMAIN!,
			dmarc: 'v=DMARC1; p=quarantine; adkim=s; aspf=s;',
			dns: sst.aws.dns({ zone: process.env.DNS_ZONE! }),
		});

		// Create Data S3 Bucket
		const dataBucket = new sst.aws.Bucket('ServobillBucket', {
			enforceHttps: true,
			cors: {
				allowOrigins: [
					process.env.SITE_DOMAIN!,
					`api.${process.env.SITE_DOMAIN!}`,
				],
				allowMethods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE'],
				allowHeaders: ['*'],
				exposeHeaders: [],
				maxAge: '0 seconds',
			},
		});

		// Create Chromium Lambda Layer
		const layerVersionResource = new aws.lambda.LayerVersion('MyLayer', {
			layerName: 'sharp',
			code: new pulumi.asset.FileArchive('layers/chromium'),
		});

		const baseEnvironment = {
			TABLE_ELECTRODB: table.name,
			SITE_DOMAIN: process.env.SITE_DOMAIN!,
			API_DOMAIN: `api.${process.env.SITE_DOMAIN!}`,
			EMAIL_SENDER: email.sender,
			BUCKET_FILES: dataBucket.name,
		};

		// ===============================
		// Create Background Workers:
		// ===============================
		const bus = new sst.aws.Bus('ServobillEventBus');
		eventHandlerEndpoints.forEach((endpoint) => {
			bus.subscribe(
				...getEventFunction(endpoint, {
					environment: { ...baseEnvironment },
					layers: [layerVersionResource.arn],
					link: [email, dataBucket, table],
				}),
			);
		});

		// SNS Topic for Email Delivery
		const deliveryTopic = new sst.aws.SnsTopic('ServobillDeliveryTopic');
		deliveryTopic.subscribe(
			'EmailDelivery',
			getFunction(
				{
					file: 'src/backend/events/delivery/status/handler.handler',
					handler: 'handler',
					eventType: 'delivery.status',
				},
				{
					environment: { ...baseEnvironment },
					link: [email, dataBucket, table],
				},
			),
		);

		// @LATER: Create Cron Job (To send emails)
		// new sst.aws.Cron('ServobillCron', {
		// 	function: 'src/cron.handler',
		// 	schedule: 'rate(10 minutes)',
		// });

		// ===============================
		// Create User Facing Services:
		// ===============================

		// API
		const api = new sst.aws.ApiGatewayV2('ServobillApiGateway', {
			domain: `api.${process.env.SITE_DOMAIN!}`,
			cors: {
				allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
				allowHeaders: [
					'Content-Type',
					'Authorization',
					'Apollo-Require-Preflight',
					'Content-Length',
					'Cookie',
				],
				allowOrigins: [
					process.env.SITE_DOMAIN!,
					`api.${process.env.SITE_DOMAIN!}`,
				],
			},
		});

		apiEndpoints.forEach((endpoint) => {
			api.route(
				...getApiFunction(endpoint, {
					environment: {
						...baseEnvironment,
						JWT_SECRET: process.env.JWT_SECRET!,
						OAUTH_CLIENT_ID: process.env.OAUTH_CLIENT_ID!,
						BUCKET_FILES: dataBucket.name,
					},
					npmInstall: npm.api.install,
					npmExternal: npm.api.external,
					link: [dataBucket, table],
				}),
			);
		});

		// Frontend
		new sst.aws.Nextjs('ServobillWeb', {
			link: [dataBucket],
			permissions: [...defaultPermissions],
			domain: process.env.SITE_DOMAIN,
			environment: {
				NEXT_PUBLIC_API_URL: api.url,
			},
		});
	},
});

/// <reference path="./.sst/platform/config.d.ts" />

import type { Output } from '@pulumi/pulumi';
import type { Input } from './.sst/platform/src/components/input';
import type { ApiEndpoint } from './stack/build-index/api';
import type { EventEndpoint } from './stack/build-index/events';
import type {
	AtLeastOneFromEach,
	UnionToIntersection,
} from './src/common/type-helpers';

const requiredEnvVars = [
	['SITE_DOMAIN'],
	['AWS_PROFILE'],
	['EMAIL_SENDER', 'EMAIL_SENDER_IDENTITY'],
	['DNS_ZONE'],
	['JWT_SECRET'],
	['OAUTH_CLIENT_ID'],
] as const satisfies string[][];

const logGroups = {
	api: '/apps/servobill/api',
	events: '/apps/servobill/events',
	crons: '/apps/servobill/crons',
} as const;

/**
 * Type that enforces at least one environment variable from each group must be defined
 */
type RequiredEnvVars = UnionToIntersection<
	AtLeastOneFromEach<typeof requiredEnvVars>
>;

/**
 * Validates that all required environment variables are present and non-empty
 * @throws Error if any required environment variable is missing or empty
 */
const validateEnvironmentVariables = (): RequiredEnvVars => {
	const filteredEnv: Record<string, string> = {};

	const missingVars = requiredEnvVars.filter((envVar) => {
		// If envVar is an array, check if at least one value exists
		return !envVar.some(
			(varName) => process.env[varName] && process.env[varName]?.trim() !== '',
		);
	});

	if (missingVars.length > 0) {
		throw new Error(
			`Missing or empty required environment variables: ${missingVars.join(
				', ',
			)}`,
		);
	}

	// Populate filteredEnv with all required environment variables
	requiredEnvVars.forEach((envVar) => {
		if (Array.isArray(envVar)) {
			// For array of env vars, use the first one that exists
			const value = envVar.find(
				(varName) =>
					process.env[varName] && process.env[varName]?.trim() !== '',
			);
			if (value) {
				filteredEnv[value] = process.env[value]!;
			}
		} else {
			// For single env var, add it directly
			filteredEnv[envVar] = process.env[envVar]!;
		}
	});

	return filteredEnv as RequiredEnvVars;
};

const npm = {
	api: {
		install: ['graphql', 'graphql-tools', 'type-graphql'],
		external: ['aws-sdk', 'pg', 'pg-native', 'sharp'],
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
	logGroup?: keyof typeof logGroups;
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
		// Dynamic imports
		const { config } = await import('dotenv');
		console.log('Loading environment variables');
		config();
		console.log('Environment variables loaded');

		const path = await import('node:path');
		const pulumi = await import('@pulumi/pulumi');
		const esbuildPluginTsc = (await import('esbuild-plugin-tsc')).default;
		const { apiEndpoints, eventHandlerEndpoints } = await import(
			'./stack/build-index'
		);
		const { tableDefinitions } = await import(
			'./stack/local/initialize/definitions/tables'
		);

		// Validate environment variables before proceeding
		const requiredEnv = validateEnvironmentVariables();

		console.log('Required environment variables:', requiredEnv);

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
				runtime: 'nodejs22.x',
				layers: options?.layers,
				environment: {
					...options?.environment,
					SITE_DOMAIN: requiredEnv.SITE_DOMAIN,
					NODE_OPTIONS: '--enable-source-maps',
				},
				timeout: `${options?.timeout ?? 60} seconds`,
				memory: `${options?.memorySize ?? 1024} MB`,
				link: options?.link,
				logging: options?.logGroup
					? {
							logGroup: logGroups[options.logGroup],
							retention: '2 months',
						}
					: undefined,
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

		// ===============================
		// Create Resources:
		// ===============================

		// Import aws module dynamically
		const aws = await import('@pulumi/aws');

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

		// Create Data S3 Bucket
		const dataBucket = new sst.aws.Bucket('ServobillBucket', {
			enforceHttps: true,
			cors: {
				allowOrigins: [
					requiredEnv.SITE_DOMAIN,
					`api.${requiredEnv.SITE_DOMAIN}`,
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

		const baseEnvironment: Record<string, Input<string>> = {
			TABLE_ELECTRODB: table.name,
			SITE_DOMAIN: requiredEnv.SITE_DOMAIN,
			API_DOMAIN: `api.${requiredEnv.SITE_DOMAIN}`,
			BUCKET_FILES: dataBucket.name,
		};
		// ===============================
		// Create Background Workers:
		// ===============================
		// SNS Topic for Email Delivery
		const deliveryTopic = new sst.aws.SnsTopic('ServobillDeliveryTopic');
		deliveryTopic.subscribe(
			'EmailDelivery',
			getFunction(
				{
					file: 'src/backend/events/delivery/status/handler',
					handler: 'handler',
					eventType: 'delivery.status',
				},
				{
					environment: { ...baseEnvironment },
					link: [dataBucket, table],
					logGroup: 'events',
				},
			),
		);

		// Create SES Email Identity
		const email = requiredEnv.EMAIL_SENDER_IDENTITY
			? sst.aws.Email.get('ServobillEmail', requiredEnv.EMAIL_SENDER_IDENTITY)
			: new sst.aws.Email('ServobillEmail', {
					sender: requiredEnv.EMAIL_SENDER,
					dmarc: 'v=DMARC1; p=quarantine; adkim=s; aspf=s;',
					dns: sst.aws.dns({ zone: requiredEnv.DNS_ZONE }),
					events: [
						{
							name: 'Status',
							types: [
								'delivery',
								'delivery-delay',
								'rendering-failure',
								'bounce',
								'complaint',
								'open',
								'click',
								'subscription',
							],
							topic: deliveryTopic.arn,
						},
					],
				});

		baseEnvironment.EMAIL_SENDER = email.sender;

		const bus = new sst.aws.Bus('ServobillEventBus');
		eventHandlerEndpoints.forEach((endpoint) => {
			bus.subscribe(
				...getEventFunction(endpoint, {
					environment: { ...baseEnvironment },
					layers: [layerVersionResource.arn],
					link: [email, dataBucket, table],
					logGroup: 'events',
				}),
			);
		});

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
			domain: `api.${requiredEnv.SITE_DOMAIN}`,
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
					`https://${requiredEnv.SITE_DOMAIN}`,
					`https://api.${requiredEnv.SITE_DOMAIN}`,
				],
			},
		});

		apiEndpoints.forEach((endpoint) => {
			api.route(
				...getApiFunction(endpoint, {
					environment: {
						...baseEnvironment,
						JWT_SECRET: requiredEnv.JWT_SECRET,
						OAUTH_CLIENT_ID: requiredEnv.OAUTH_CLIENT_ID,
						BUCKET_FILES: dataBucket.name,
					},
					npmInstall: npm.api.install,
					npmExternal: npm.api.external,
					link: [dataBucket, table],
					logGroup: 'api',
				}),
			);
		});

		// Frontend
		new sst.aws.Nextjs('ServobillWeb', {
			link: [dataBucket],
			permissions: [...defaultPermissions],
			domain: requiredEnv.SITE_DOMAIN,
			environment: {
				NEXT_PUBLIC_API_URL: api.url,
			},
		});
	},
});

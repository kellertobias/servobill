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

const logGroupPrefix = process.env.LOG_GROUP_PREFIX ?? 'servobill';
const logGroupNames = {
	web: `${logGroupPrefix}/web`,
	api: `${logGroupPrefix}/api`,
	events: `${logGroupPrefix}/events`,
	crons: `${logGroupPrefix}/crons`,
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

const defaultPermissions: {
	actions: string[];
	resources: (string | Output<string>)[];
}[] = [];

type GetFunctionOptions = {
	environment?: Record<string, Input<string>>;
	layers?: (string | Output<string>)[];
	link?: sst.aws.FunctionArgs['link'];
	npmInstall?: string[];
	npmExternal?: string[];
	timeout?: number;
	memorySize?: number;
	logGroup?: keyof typeof logGroupNames;
	description?: string;
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
					profile: process.env.USE_AWS_PROFILE,
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
		const aws = await import('@pulumi/aws');
		const esbuildPluginTsc = (await import('esbuild-plugin-tsc')).default;
		const { apiEndpoints, eventHandlerEndpoints } = await import(
			'./stack/build-index'
		);
		const { tableDefinitions } = await import(
			'./stack/local/initialize/definitions/tables'
		);

		const runtime = aws.lambda.Runtime.NodeJS20dX;

		// Validate environment variables before proceeding
		const requiredEnv = validateEnvironmentVariables();

		const getFunction = (
			endpoint: ApiEndpoint | EventEndpoint,
			options?: GetFunctionOptions,
		): sst.aws.FunctionArgs => {
			const descriptionPrefix = endpoint.method
				? `${endpoint.method} `
				: `Event ${endpoint.eventType} `;

			return {
				handler: `${endpoint.file}.${endpoint.handler}`,
				description:
					options?.description ??
					`Servobill ${descriptionPrefix} ${endpoint.path}`,
				permissions: defaultPermissions,
				runtime,
				layers: options?.layers,
				environment: {
					...options?.environment,
					SITE_DOMAIN: requiredEnv.SITE_DOMAIN,
					NODE_OPTIONS: '--enable-source-maps --require reflect-metadata',
				},
				timeout: `${options?.timeout ?? 60} seconds`,
				memory: `${options?.memorySize ?? 1024} MB`,
				link: options?.link,
				logging: options?.logGroup
					? {
							logGroup: logGroups[options.logGroup].name,
						}
					: undefined,
				nodejs: {
					format: 'cjs',
					sourcemap: true,
					esbuild: {
						plugins: [
							esbuildPluginTsc({
								tsconfigPath: path.resolve('tsconfig.json'),
							}),
						],
						external: options?.npmExternal,
					},
					install: [...(options?.npmInstall ?? []), 'reflect-metadata'],
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

		// ===============================
		// Create Resources:
		// ===============================

		const logGroups = {} as Record<
			keyof typeof logGroupNames,
			aws.cloudwatch.LogGroup
		>;

		for (const [name, logGroupName] of Object.entries(logGroupNames)) {
			logGroups[name] = new aws.cloudwatch.LogGroup(name, {
				name: logGroupName,
				tags: {
					app: 'servobill',
				},
				retentionInDays: 60,
			});
		}

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
					`https://${requiredEnv.SITE_DOMAIN}`,
					`https://api.${requiredEnv.SITE_DOMAIN}`,
				],
				allowMethods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE'],
				allowHeaders: ['*'],
				exposeHeaders: [],
				maxAge: '0 seconds',
			},
		});

		const baseEnvironment: Record<string, Input<string>> = {
			TABLE_ELECTRODB: table.name,
			SITE_DOMAIN: requiredEnv.SITE_DOMAIN,
			API_DOMAIN: `api.${requiredEnv.SITE_DOMAIN}`,
			BUCKET_FILES: dataBucket.name,
			ALLOWED_EMAILS: process.env.ALLOWED_EMAILS!,
		};
		// ===============================
		// Create Remaining Resources:
		// ===============================
		// SNS Topic for Email Delivery
		const deliveryTopic = new sst.aws.SnsTopic('ServobillDeliveryTopic');

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

		// Add permissions to access resources
		defaultPermissions.push({
			actions: ['events:PutEvents'],
			resources: [bus.arn],
		});

		defaultPermissions.push({
			actions: ['sns:Publish'],
			resources: [deliveryTopic.arn],
		});

		defaultPermissions.push({
			actions: ['sns:Subscribe'],
			resources: [deliveryTopic.arn],
		});

		defaultPermissions.push({
			actions: ['s3:GetObject', 's3:PutObject', 's3:PutObjectAcl'],
			resources: [dataBucket.arn],
		});

		defaultPermissions.push({
			actions: ['dynamodb:*'],
			resources: [table.arn],
		});

		baseEnvironment.EVENT_BUS_NAME = bus.name;

		// ===============================
		// Create Event Handlers:
		// ===============================
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
					description: 'Servobill Email Delivery Status Handler',
				},
			),
		);

		const eventHandlerFunctions: Record<
			string,
			{ fn: sst.aws.Function; name: string }
		> = {};
		for (const endpoint of eventHandlerEndpoints) {
			const handlerFunctionDefinition = getFunction(endpoint, {
				environment: {
					...baseEnvironment,
					...(process.env.LLM_API_KEY
						? { LLM_API_KEY: process.env.LLM_API_KEY }
						: {}),
					...(process.env.LLM_MODEL
						? { LLM_MODEL: process.env.LLM_MODEL }
						: {}),
					...(process.env.LLM_BASE_URL
						? { LLM_BASE_URL: process.env.LLM_BASE_URL }
						: {}),
					...(process.env.LLM_PROVIDER
						? { LLM_PROVIDER: process.env.LLM_PROVIDER }
						: {}),
				},
				link: [email, dataBucket, table, bus],
				logGroup: 'events',
				timeout: 300,
				description: `Servobill Event Handler: ${endpoint.eventType}`,
				npmInstall: ['@sparticuz/chromium'],
			});

			const eventName = endpoint.eventType
				.split('.')
				.map((part) => part[0].toUpperCase() + part.slice(1))
				.join('');

			const fn = new sst.aws.Function(`Handler${eventName}`, {
				...handlerFunctionDefinition,
			});
			eventHandlerFunctions[endpoint.eventType] = { fn, name: eventName };
		}

		for (const [eventType, { fn, name }] of Object.entries(
			eventHandlerFunctions,
		)) {
			bus.subscribe(`Rule${name}`, fn.arn, {
				pattern: {
					detailType: [eventType],
				},
				transform: {
					rule: {
						name: `ServobillEventRule${name}`,
						description: `Servobill Event Rule: ${eventType}`,
					},
				},
			});
		}

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
				allowCredentials: true,
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
					link: [dataBucket, table, bus],
					logGroup: 'api',
				}),
			);
		});

		// Frontend
		const web = new sst.aws.Nextjs('ServobillWeb', {
			link: [dataBucket],
			permissions: [...defaultPermissions],
			domain: requiredEnv.SITE_DOMAIN,
			environment: {
				NEXT_PUBLIC_API_URL: api.url,
				NEXT_PUBLIC_HAS_LLM: process.env.LLM_API_KEY ? 'true' : 'false',
			},
			transform: {
				server: {
					logging: {
						logGroup: logGroups.web.name,
					},
				},
			},
		});
	},
});

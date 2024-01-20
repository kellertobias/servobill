import * as lambda from 'aws-cdk-lib/aws-lambda';
import { StackContext } from 'sst/constructs';

import { eventHandlerEndpoints, apiEndpoints } from './build-index';

export const getLayers = ({
	stack,
	openTelemetry,
}: StackContext & { openTelemetry: null | unknown }) => {
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
		// eslint-disable-next-line no-console
		console.log(`[Layer] ${layerPath} - ${logicalId}`);
		layerCache[layerPath] = new lambda.LayerVersion(stack, logicalId, {
			code: lambda.Code.fromAsset(layerPath),
		});
	}

	const baseLayers = [
		openTelemetry
			? lambda.LayerVersion.fromLayerVersionArn(
					stack,
					'LayerOtelCollector',
					`arn:aws:lambda:${stack.region}:184161586896:layer:opentelemetry-collector-amd64-0_3_1:1`,
				)
			: undefined,
		// openTelemetry
		// 	? lambda.LayerVersion.fromLayerVersionArn(
		// 			stack,
		// 			'LayerOtelInstrumentation',
		// 			`arn:aws:lambda:${stack.region}:184161586896:layer:opentelemetry-nodejs-0_3_0:1`,
		// 		)
		// 	: undefined,
		process.env.LOGS_ENDPOINT
			? lambda.LayerVersion.fromLayerVersionArn(
					stack,
					'LayerLogsCollector',
					`arn:aws:lambda:eu-central-1:052128734523:layer:LogsCollectorLambdaLayerE1B12DD5:30`,
				)
			: undefined,
	].filter((x) => !!x) as lambda.ILayerVersion[];

	return {
		baseLayers,
		layerCache,
	};
};

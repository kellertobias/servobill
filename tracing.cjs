// tracing.js
'use strict';

const process = require('process');

const opentelemetry = require('@opentelemetry/sdk-node');
const {
	OTLPTraceExporter,
} = require('@opentelemetry/exporter-trace-otlp-grpc');
const { Resource } = require('@opentelemetry/resources');
const {
	SemanticResourceAttributes,
} = require('@opentelemetry/semantic-conventions');
const {
	BasicTracerProvider,
	SimpleSpanProcessor,
} = require('@opentelemetry/tracing');

// Setup Environment
const serviceName =
	process.env.OTEL_SERVICE_NAME ||
	process.env.SERVICE_NAME ||
	process.env.AWS_LAMBDA_FUNCTION_NAME ||
	process.env.SERVICE_NAME_FALLBACK ||
	'NO-SERVICE-NAME-PROVIDED';

const resource = Resource.default().merge(
	new Resource({
		[SemanticResourceAttributes.SERVICE_NAME]: serviceName,
		[SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
			process.env.OTEL_SERVICE_ENVIRONMENT || 'production',
		[SemanticResourceAttributes.SERVICE_NAMESPACE]:
			process.env.SERVICE_NAMESPACE || 'UNNAMED_NAMESPACE',
	}),
);
// Setup Traces
const traceExporter = new OTLPTraceExporter({
	url: 'http://localhost:4317',
});

// const provider = new BasicTracerProvider({ resource });
// export spans to console (useful for debugging)
// provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
// export spans to opentelemetry collector
const spanProcessor = new SimpleSpanProcessor(traceExporter);
// provider.addSpanProcessor(spanProcessor);
// provider.register();

// Glue it all together
const sdk = new opentelemetry.NodeSDK({
	resource,
	traceExporter,
	spanProcessor,
	instrumentations: [],
});

// initialize the SDK and register with the OpenTelemetry API
// this enables the API to record telemetry

sdk.start();
// gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
	sdk
		.shutdown()
		.catch((error) => console.log({ msg: 'Error terminating tracing', error }))
		.finally(() => process.exit(0));
});

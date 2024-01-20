import fs from 'fs';

const maybeParseJson = (str?: string) => {
	try {
		if (!str) {
			return {};
		}
		return JSON.parse(str);
	} catch {
		return {};
	}
};
const endpoint = process.env.OTEL_ENDPOINT;
const headers = maybeParseJson(process.env.OTEL_HEADERS);
const otelConfig = () =>
	endpoint
		? `
#Set an environment variable 'OPENTELEMETRY_COLLECTOR_CONFIG_FILE' to '/var/task/collector.yaml'
# Receivers are the source of telemetry data.
receivers:
	otlp:
		protocols:
			grpc:
				endpoint: 0.0.0.0:4317
			http:
				endpoint: 0.0.0.0:4318

# Processors are pipeline components that transform spans or metrics.
processors:
	# At the end of a lambda function's execution, the OpenTelemetry client
	# libraries will flush any pending spans/metrics/logs to the collector
	# before returning control to the Lambda environment.
	# The collector's pipelines are synchronous and this means that the
	# response of the lambda function is delayed until the data has been
	# exported. This delay can potentially be for hundreds of milliseconds.
	# To overcome this problem the decouple processor can be used to separate
	# the two ends of the collectors pipeline and allow the lambda function
	# to complete while ensuring that any data is exported before the
	# Lambda environment is frozen.
	decouple:

	# If your lambda function is invoked frequently it is also possible to
	# pair the decouple processor with the batch processor to reduce total
	# lambda execution time at the expense of delaying the export of
	# OpenTelemetry data. When used with the batch processor the decouple
	# processor must be the last processor in the pipeline to ensure that
	# data is successfully exported before the lambda environment is frozen.

	# batch:
	#   timeout: 15s

# Exporters are the final destination of the telemetry data.
exporters:
	otlphttp:
		endpoint: "${endpoint}"
		headers:
${Object.entries(headers)
	.map(([key, value]) => `			${key}: "${value}"`)
	.join('\n')}
#		sending_queue:
#			enabled: false
#		retry_on_failure:
#			enabled: false

service:
	pipelines:
		traces:
			receivers: [otlp]
			processors: [decouple]
			exporters: [otlphttp]
	extensions: []
#	telemetry:
#  		logs:
#  			level: debug
`
		: null;

export const makeOtelConfig = () => {
	const config = otelConfig();
	if (!config) {
		return null;
	}
	// Write file as YAML to collector.yaml
	fs.writeFileSync('collector.yaml', config.replaceAll('\t', '  '));
	return { from: './collector.yaml' };
};

export const otelBaseConfig = {
	OTEL_LOG_LEVEL: process.env.OTEL_ENDPOINT ? 'WARN' : undefined,
	OPENTELEMETRY_EXTENSION_LOG_LEVEL: process.env.OTEL_ENDPOINT
		? 'WARN'
		: undefined,
	OPENTELEMETRY_COLLECTOR_CONFIG_FILE: process.env.OTEL_ENDPOINT
		? '/var/task/collector.yaml'
		: undefined,
	AWS_LAMBDA_EXEC_WRAPPER: process.env.OTEL_ENDPOINT
		? '/opt/otel-handler'
		: undefined,
	OTEL_NODE_RESOURCE_DETECTORS: 'aws',
	JSON_LOGS_ENDPOINT: process.env.LOGS_ENDPOINT,
	JSON_LOGS_HEADERS: process.env.LOGS_HEADERS,
};

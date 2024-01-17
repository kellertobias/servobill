import fs from 'fs';

// eslint-disable-next-line import/no-extraneous-dependencies
import yaml from 'js-yaml';

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
		? {
				receivers: {
					otlp: {
						protocols: {
							grpc: {
								endpoint: '0.0.0.0:4317',
							},
							http: {
								endpoint: '0.0.0.0:4318',
							},
						},
					},
				},
				processors: {
					decouple: null,
				},
				exporters: {
					otlphttp: {
						endpoint,
						headers,
						sending_queue: {
							enabled: false,
						},
						retry_on_failure: {
							enabled: false,
						},
					},
				},
				service: {
					pipelines: {
						traces: {
							receivers: ['otlp'],
							processors: ['decouple'],
							exporters: ['otlphttp'],
						},
					},
					extensions: [],
				},
			}
		: null;

export const makeOtelConfig = () => {
	const config = otelConfig();
	if (!config) {
		return null;
	}
	// Write file as YAML to collector.yaml
	const file = yaml.dump(config);
	fs.writeFileSync('collector.yaml', file);
	return { from: 'collector.yaml' };
};

export const otelBaseConfig = {
	OTEL_LOG_LEVEL: 'WARN',
	OPENTELEMETRY_EXTENSION_LOG_LEVEL: 'ERROR',
	OPENTELEMETRY_COLLECTOR_CONFIG_FILE: '/var/task/collector.yaml',
	AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler',
};

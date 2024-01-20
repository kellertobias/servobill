import {
	EventBridgeClient,
	PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import { trace, context, propagation } from '@opentelemetry/api';

import { ConfigService } from './config.service';
import { Logger } from './logger.service';

import { CustomJson } from '@/common/json';
import { Inject, Service } from '@/common/di';
const tracer = trace.getTracer('eventbus');

@Service()
export class EventBusService {
	private logger = new Logger(EventBusService.name);
	private client: EventBridgeClient;
	constructor(
		@Inject(ConfigService) private readonly configuration: ConfigService,
	) {
		const eventBridgeOptions = {
			...(this.configuration.endpoints.eventbridge
				? {
						endpoint: this.configuration.endpoints.eventbridge,
					}
				: {}),
			region: this.configuration.region,
			credentials:
				this.configuration.awsCreds.accessKeyId &&
				this.configuration.awsCreds.secretAccessKey
					? {
							accessKeyId: this.configuration.awsCreds.accessKeyId,
							secretAccessKey: this.configuration.awsCreds.secretAccessKey,
						}
					: undefined,
		};
		this.client = new EventBridgeClient(eventBridgeOptions);
	}

	public async send<T>(
		messageType: string,
		message: T,
		options?: {
			source: string;
			resources: string[];
		},
	): Promise<string | undefined> {
		this.logger.info('Sending event', {
			type: messageType,
			message,
			options,
		});

		const tracerContext = {};
		propagation.inject(context.active(), tracerContext);
		return tracer.startActiveSpan('sendEvent', async (span) => {
			const response = await this.client.send(
				new PutEventsCommand({
					Entries: [
						{
							EventBusName: this.configuration.eventBusName,
							Detail: CustomJson.toJson({
								...message,
								...tracerContext,
								traceId: span.spanContext().traceId,
								spanId: span.spanContext().spanId,
							}),
							DetailType: messageType,
							Resources: options?.resources,
							Source: options?.source || 'default',
						},
					],
				}),
			);

			this.logger.info('Event Sent', {
				type: messageType,
				response,
				options,
			});

			return response.Entries?.[0].EventId;
		});
	}
}

import {
	EventBridgeClient,
	PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import { trace, context, propagation } from '@opentelemetry/api';

import { Span } from '../instrumentation';

import type { ConfigService } from './config.service';
import { Logger } from './logger.service';
import { CONFIG_SERVICE } from './di-tokens';

import { CustomJson } from '@/common/json';
import { Inject, Service } from '@/common/di';
const tracer = trace.getTracer('eventbus');

@Service()
export class EventBusService {
	private logger = new Logger(EventBusService.name);
	private client: EventBridgeClient;
	constructor(
		@Inject(CONFIG_SERVICE) private readonly configuration: ConfigService,
	) {
		const nonStandardEndpoint =
			this.configuration.endpoints.eventbridge &&
			!this.configuration.endpoints.eventbridge.includes('.');

		if (nonStandardEndpoint) {
			console.log('Using non-standard eventbridge endpoint', {
				endpoint: this.configuration.endpoints.eventbridge,
			});
		}
		const eventBridgeOptions = {
			...(this.configuration.endpoints.eventbridge
				? {
						endpoint: this.configuration.endpoints.eventbridge,
					}
				: {}),
			region: this.configuration.region,
			credentials: (() => {
				if (
					this.configuration.awsCreds &&
					this.configuration.awsCreds.accessKeyId &&
					this.configuration.awsCreds.secretAccessKey
				) {
					return {
						accessKeyId: this.configuration.awsCreds.accessKeyId,
						secretAccessKey: this.configuration.awsCreds.secretAccessKey,
					};
				}
				if (nonStandardEndpoint) {
					return {
						accessKeyId: 'local',
						secretAccessKey: 'local',
					};
				}
				return;
			})(),
		};
		this.client = new EventBridgeClient(eventBridgeOptions);
	}

	@Span('EventBusService.send')
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

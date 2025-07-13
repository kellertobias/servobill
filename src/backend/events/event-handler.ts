import { Context, EventBridgeEvent } from 'aws-lambda';
import { validateOrReject, ValidationError } from 'class-validator';

import { Logger } from '../services/logger.service';

import { EventHandler as EventHandlerFunction } from './types';

import { withInstrumentation } from '@/backend/instrumentation';

export const makeEventHandler = <T extends object>(
	EventValidatorClass: new () => T,
	handler: (
		data: T,
		context: Context & {
			logger: Logger;
			originalEvent: EventBridgeEvent<string, unknown>;
		},
	) => Promise<void>,
): EventHandlerFunction => {
	return withInstrumentation(
		{
			name: `event.${EventValidatorClass.name.toLowerCase()}`,
		},

		async (event: EventBridgeEvent<string, unknown>, context: Context) => {
			const logger = new Logger(EventValidatorClass.name);
			logger.info(`Start Handler for Event ${event['detail-type']}`, {
				eventName: event['detail-type'],
				event: JSON.stringify(event.detail),
				eventId: event.id,
			});

			const eventData = new EventValidatorClass();
			Object.assign(eventData, event.detail);

			try {
				await validateOrReject(eventData, {
					forbidUnknownValues: false,
				});
			} catch (error: unknown) {
				if (error instanceof ValidationError) {
					logger.info(
						`Event Data Validation failed for ${event['detail-type']}`,
						{
							eventName: event['detail-type'],
							event: event.detail,
							eventId: event.id,
							errors: error.constraints,
						},
					);
				} else {
					logger.error(
						`Event Data Validation failed for ${event['detail-type']}`,
						{
							eventName: event['detail-type'],
							event: event.detail,
							eventId: event.id,
							error,
						},
					);
				}
			}

			try {
				return handler(eventData, { ...context, originalEvent: event, logger });
			} catch (error: unknown) {
				logger.error(`Handler failed for Event ${event['detail-type']}`, {
					eventName: event['detail-type'],
					event: event.detail,
					eventId: event.id,
					error,
				});
				throw error;
			}
		},
	);
};

import { Context, EventBridgeEvent } from 'aws-lambda';
import { validateOrReject } from 'class-validator';

import { Logger } from '../services/logger.service';

import { EventHandler as EventHandlerFunction } from './types';

import { withInstrumentation } from '@/backend/instrumentation';

export const makeEventHandler = <T extends object>(
	EventValidatorClass: new () => T,
	handler: (
		data: T,
		event: EventBridgeEvent<string, unknown>,
		context: Context & { logger: Logger },
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
				event: event.detail,
				eventId: event.id,
			});

			const eventData = new EventValidatorClass();
			Object.assign(eventData, event.detail);

			try {
				await validateOrReject(eventData, {
					forbidUnknownValues: false,
				});
			} catch {
				logger.info(
					`Event Data Validation failed for ${event['detail-type']}`,
					{
						eventName: event['detail-type'],
						event: event.detail,
						eventId: event.id,
					},
				);
				throw new Error(`Event validation failed`);
			}

			try {
				return handler(eventData, event, { ...context, logger });
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

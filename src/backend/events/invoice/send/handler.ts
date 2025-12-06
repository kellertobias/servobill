import 'reflect-metadata';

import '@/backend/services/config.service';

import { Logger } from '@/backend/services/logger.service';
import { DefaultContainer } from '@/common/di';
import { makeEventHandler } from '../../event-handler';
import type { EventHandler } from '../../types';
import { InvoiceSendEvent } from './event';
import { HandlerExecution } from './execute';

export const handlerName = 'handler';
export const layers = ['layers/chromium'];
export const handler: EventHandler = makeEventHandler(
	InvoiceSendEvent,
	async (event) => {
		const logger = new Logger('InvoiceSendHandlerWrapper');
		try {
			const handler = DefaultContainer.get(HandlerExecution);
			await handler.execute(event);
			logger.info('Event processed', {
				invoiceId: event.invoiceId,
			});
		} catch (error) {
			logger.error('Error sending invoice', {
				invoiceId: event.invoiceId,
				error,
			});
		}
	},
);

import 'reflect-metadata';

import '@/backend/services/config.service';

import { EventHandler } from '../../types';
import { makeEventHandler } from '../../event-handler';

import { InvoiceSendEvent } from './event';
import { HandlerExecution } from './execute';

import { Logger } from '@/backend/services/logger.service';
import { DefaultContainer } from '@/common/di';

export const handlerName = 'handler';
export const layers = ['layers/chromium'];
export const handler: EventHandler = makeEventHandler(
	InvoiceSendEvent,
	async (event) => {
		try {
			const handler = DefaultContainer.get(HandlerExecution);
			await handler.execute(event);
		} catch (error) {
			const logger = new Logger('InvoiceSendHandler');
			logger.error('Error sending invoice', {
				invoiceId: event.invoiceId,
				error,
			});
		}
	},
);

import 'reflect-metadata';

import '@/backend/services/config.service';

import { EventHandler } from '../../types';
import { makeEventHandler } from '../../event-handler';

import { InvoiceSendLaterEvent } from './event';
import { HandlerExecution } from './execute';

import { DefaultContainer } from '@/common/di';

/**
 * Lambda handler for the InvoiceSendLaterEvent.
 *
 * This handler is triggered when a scheduled invoice send is due. It delegates to the same
 * execution logic as the immediate send event, ensuring consistent behavior for both scheduled
 * and immediate sends.
 */
export const handlerName = 'handler';
export const layers = ['layers/chromium'];
export const handler: EventHandler = makeEventHandler(
	InvoiceSendLaterEvent,
	async (event) => {
		const handler = DefaultContainer.get(HandlerExecution);
		await handler.execute(event);
	},
);

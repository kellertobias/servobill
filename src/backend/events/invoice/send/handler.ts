import 'reflect-metadata';

import { EventHandler } from '../../types';
import { makeEventHandler } from '../../event-handler';

import { InvoiceSendEvent } from './event';
import { HandlerExecution } from './execute';

import { DefaultContainer } from '@/common/di';

export const handlerName = 'handler';
export const layers = ['layers/chromium'];
export const handler: EventHandler = makeEventHandler(
	InvoiceSendEvent,
	async (event) => {
		const handler = DefaultContainer.get(HandlerExecution);
		await handler.execute(event);
	},
);

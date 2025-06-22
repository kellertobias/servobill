import 'reflect-metadata';

import '@/backend/services/config.service';
import '@/backend/services/llm.service';

import { EventHandler } from '../types';
import { makeEventHandler } from '../event-handler';

import { ReceiptEvent } from './event';
import { HandlerExecution } from './execute';

import { DefaultContainer } from '@/common/di';

export const handlerName = 'handler';
export const layers: string[] = [];
export const handler: EventHandler = makeEventHandler(
	ReceiptEvent,
	async (event: ReceiptEvent) => {
		const handler = DefaultContainer.get(HandlerExecution);
		await handler.execute(event);
	},
);

import 'reflect-metadata';

import '@/backend/services/config.service';

import { EventHandler } from '../types';
import { makeEventHandler } from '../event-handler';

import { CronEvent } from './event';
import { HandlerExecution } from './execute';

import { DefaultContainer } from '@/common/di';

export const handlerName = 'handler';

/**
 * Entrypoint for the cron event handler. Validates the event and delegates to HandlerExecution.
 */
export const handler: EventHandler = makeEventHandler(
	CronEvent,
	async (event) => {
		const handler = DefaultContainer.get(HandlerExecution);
		await handler.execute(event);
	},
);

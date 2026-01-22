import 'reflect-metadata';

import '@/backend/services/config.service';

import { DefaultContainer } from '@/common/di';
import { makeEventHandler } from '../event-handler';
import type { EventHandler } from '../types';
import { BackupExecuteEvent } from './event';
import { BackupHandler } from './execute';

export const handlerName = 'handler';

export const handler: EventHandler = makeEventHandler(
	BackupExecuteEvent,
	async (event, { logger }) => {
		const handler = DefaultContainer.get(BackupHandler);
		await handler.handle();
	},
);

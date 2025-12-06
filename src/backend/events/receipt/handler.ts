import 'reflect-metadata';

import '@/backend/services/config.service';
import '@/backend/services/llm.service';

import { DefaultContainer } from '@/common/di';
import { makeEventHandler } from '../event-handler';
import type { EventHandler } from '../types';
import { ReceiptEvent } from './event';
import { HandlerExecution } from './execute';

export const handlerName = 'handler';
export const layers: string[] = [];
export const handler: EventHandler = makeEventHandler(ReceiptEvent, async (event: ReceiptEvent) => {
  const handler = DefaultContainer.get(HandlerExecution);
  await handler.execute(event);
});

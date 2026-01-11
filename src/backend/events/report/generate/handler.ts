import 'reflect-metadata';

import '@/backend/services/config.service';

import { Logger } from '@/backend/services/logger.service';
import { DefaultContainer } from '@/common/di';
import { makeEventHandler } from '../../event-handler';
import type { EventHandler } from '../../types';
import { ReportGenerateEvent } from './event';
import { ReportGenerateHandlerExecution } from './execute';

export const handlerName = 'handler';
export const layers = ['layers/chromium'];

// Helper to define the event class for makeEventHandler
class ReportGenerateEventClass implements ReportGenerateEvent {
	start!: string;
	end!: string;
	format!: 'simple' | 'categorized';
	recipientEmail!: string;
}

export const handler: EventHandler = makeEventHandler(
	ReportGenerateEventClass,
	async (event) => {
		const logger = new Logger('ReportGenerateHandlerWrapper');
		try {
			const handler = DefaultContainer.get(ReportGenerateHandlerExecution);
			await handler.execute(event);
			logger.info('Report generation event processed', {
				email: event.recipientEmail,
			});
		} catch (error) {
			logger.error('Error generating report', {
				email: event.recipientEmail,
				error,
			});
		}
	},
);

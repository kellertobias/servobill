import { EventHandlerImport } from '@/common/api-types';

const handlers: Record<string, EventHandlerImport> = {
	'cron': async () =>
		await import('@/backend/events/cron/handler').then(
			(importedModule) => importedModule.handler,
		),
	'invoice.later': async () =>
		await import('@/backend/events/invoice/later/handler').then(
			(importedModule) => importedModule.handler,
		),
	'invoice.pdf': async () =>
		await import('@/backend/events/invoice/pdf/handler').then(
			(importedModule) => importedModule.handler,
		),
	'invoice.send': async () =>
		await import('@/backend/events/invoice/send/handler').then(
			(importedModule) => importedModule.handler,
		),
	'receipt': async () =>
		await import('@/backend/events/receipt/handler').then(
			(importedModule) => importedModule.handler,
		),
	'template': async () =>
		await import('@/backend/events/template/handler').then(
			(importedModule) => importedModule.handler,
		),
};

export default handlers;

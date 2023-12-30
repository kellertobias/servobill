import { EventHandlerImport } from '@/common/api-types';

const handlers: Record<string, EventHandlerImport> = {
	'invoice.pdf': async () =>
		await import('@/backend/events/invoice/pdf/handler').then(
			(importedModule) => importedModule.handler,
		),
	'invoice.send': async () =>
		await import('@/backend/events/invoice/send/handler').then(
			(importedModule) => importedModule.handler,
		),
	'template': async () =>
		await import('@/backend/events/template/handler').then(
			(importedModule) => importedModule.handler,
		),
};

export default handlers;

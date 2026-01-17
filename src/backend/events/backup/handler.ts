
import { DefaultContainer } from '@/common/di';
import { type EventType, Handler } from '../handler-wrapper';
import { BackupHandler } from './execute';

export const handler: Handler<EventType<unknown>> = async (
	event,
	context,
	callback,
) => {
	const handler = DefaultContainer.get(BackupHandler);
	await handler.handle();
};

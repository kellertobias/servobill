import type { EventBridgeEvent, Context } from 'aws-lambda';

export type EventHandler = (
	event: EventBridgeEvent<string, unknown>,
	context: Context,
) => Promise<void>;

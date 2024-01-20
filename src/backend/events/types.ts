import type { EventBridgeEvent, Handler } from 'aws-lambda';

export type EventHandler = Handler<EventBridgeEvent<string, unknown>, void>;

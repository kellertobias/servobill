import type { EventBridgeEvent, Handler, SNSEvent } from 'aws-lambda';

export type EventHandler = Handler<EventBridgeEvent<string, unknown>, void>;
export type SNSEventHandler = Handler<SNSEvent, void>;

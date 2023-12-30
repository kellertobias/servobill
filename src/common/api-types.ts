import { APIGatewayProxyHandlerV2 } from 'aws-lambda';

import { EventHandler } from '@/backend/events/types';

export const HttpVerbs = [
	'GET',
	'HEAD',
	'POST',
	'PUT',
	'DELETE',
	'PATCH',
	'OPTIONS',
	'ANY',
] as const;

export type HttpVerb = (typeof HttpVerbs)[number];

export type Handler = () => Promise<
	APIGatewayProxyHandlerV2<unknown> | APIGatewayProxyHandlerV2
>;

export type EventHandlerImport = () => Promise<EventHandler>;

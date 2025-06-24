// This import must come first before any other imports
// import 'reflect-metadata';

// Import repositories before they are used
import '@/backend/services/config.service';
import '@/backend/repositories';

import { withSession } from '../session';

import { getGraphQLServer } from './server';
import { contextBuilder } from './context-builder';

import { withInstrumentation } from '@/backend/instrumentation';

export const method = 'ANY';
export const handlerName = 'handler';
export const handler = withInstrumentation(
	{
		name: 'api.graphql',
	},
	withSession(async (evt, ctx) => {
		const gqlHandler = await getGraphQLServer(contextBuilder);
		const answer = await gqlHandler(
			{ ...evt, httpMethod: evt.requestContext.http.method },
			ctx,
			() => {},
		);
		return answer;
	}),
);

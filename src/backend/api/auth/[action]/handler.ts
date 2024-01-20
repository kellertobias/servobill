import 'reflect-metadata';

import { APIHandler } from '../../types';

import { googleOidRequestHandler } from './google-oid-request';
import { googleOidCallbackHandler } from './google-oid-callback';
import { tokenRenewalHandler } from './renew';
import { logoutHandler } from './logout';

import { withInstrumentation } from '@/backend/instrumentation';

export const method = 'ANY';
export const handlerName = 'handler';
export const handler: APIHandler = withInstrumentation(
	{
		name: 'auth',
	},
	async (evt, ctx) => {
		const action = evt.pathParameters?.['action'];
		switch (action) {
			case 'authorize': {
				return googleOidRequestHandler(evt, ctx);
			}
			case 'callback': {
				return googleOidCallbackHandler(evt, ctx);
			}
			case 'renew': {
				return tokenRenewalHandler(evt, ctx);
			}
			case 'logout': {
				return logoutHandler(evt, ctx);
			}
		}
		return {
			statusCode: 404,
			body: JSON.stringify({ message: 'Not Found' }),
		} as Awaited<ReturnType<APIHandler>>;
	},
);

// This export is required because of a bug in OpenTelemetry
// eslint-disable-next-line unicorn/prefer-module
module.exports = { handler };

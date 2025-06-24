import 'reflect-metadata';

import '@/backend/services/config.service';
import '@/backend/repositories';

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
		name: 'api.auth',
	},
	async (evt, ctx, cb) => {
		const action = evt.pathParameters?.['action'];
		switch (action) {
			case 'authorize': {
				return googleOidRequestHandler(evt, ctx, cb);
			}
			case 'callback': {
				return googleOidCallbackHandler(evt, ctx, cb);
			}
			case 'renew': {
				return tokenRenewalHandler(evt, ctx, cb);
			}
			case 'logout': {
				return logoutHandler(evt, ctx, cb);
			}
		}
		return {
			statusCode: 404,
			body: JSON.stringify({ message: 'Not Found' }),
		} as Awaited<ReturnType<APIHandler>>;
	},
);

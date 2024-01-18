import 'reflect-metadata';

import { APIHandler } from '../../types';

import { googleOidRequestHandler } from './google-oid-request';
import { googleOidCallbackHandler } from './google-oid-callback';
import { tokenRenewalHandler } from './renew';
import { logoutHandler } from './logout';

export const method = 'ANY';
export const handlerName = 'handler';
export const handler: APIHandler = async (evt, ctx) => {
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
};

// eslint-disable-next-line unicorn/prefer-module
module.exports = { handler };

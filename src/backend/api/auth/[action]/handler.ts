import 'reflect-metadata';

import '@/backend/services/config.service';
import '@/backend/repositories';

import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { withInstrumentation } from '@/backend/instrumentation';
import type { APIHandler } from '../../types';
import { GOOGLE_PROVIDER_ID } from '../config';
import { googleOidCallbackHandler } from './google-oid-callback';
import { googleOidRequestHandler } from './google-oid-request';
import { localLoginHandler } from './local-login';
import { logoutHandler } from './logout';
import { oidcCallbackHandler } from './oidc-callback';
import { oidcRequestHandler } from './oidc-request';
import { tokenRenewalHandler } from './renew';

export const method = 'ANY';
export const handlerName = 'handler';

const routes: Record<string, APIHandler> = {
	// `/api/auth/authorize?provider=<id>`. Without provider: Google (legacy).
	authorize: (evt, ctx, cb) => {
		const provider = evt.queryStringParameters?.provider;
		return !provider || provider === GOOGLE_PROVIDER_ID
			? googleOidRequestHandler(evt, ctx, cb)
			: oidcRequestHandler(evt, ctx, cb);
	},
	// Google implicit flow callback (form_post), kept for existing setups.
	callback: googleOidCallbackHandler,
	// Generic OpenID Connect authorization code callback.
	'oidc-callback': oidcCallbackHandler,
	// Local email + password sign in.
	login: localLoginHandler,
	renew: tokenRenewalHandler,
	logout: logoutHandler,
};

export const handler: APIHandler = withInstrumentation(
	{
		name: 'api.auth',
	},
	async (
		evt,
		ctx,
		cb,
	): Promise<APIGatewayProxyStructuredResultV2 | undefined> => {
		const action = evt.pathParameters?.action;
		const route =
			action && Object.hasOwn(routes, action) ? routes[action] : undefined;
		if (route) {
			return (await route(evt, ctx, cb)) as APIGatewayProxyStructuredResultV2;
		}
		return {
			statusCode: 404,
			body: JSON.stringify({ message: 'Not Found' }),
		} as APIGatewayProxyStructuredResultV2;
	},
);

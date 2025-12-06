import 'reflect-metadata';

import '@/backend/services/config.service';
import '@/backend/repositories';

import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { withInstrumentation } from '@/backend/instrumentation';
import type { APIHandler } from '../../types';
import { googleOidCallbackHandler } from './google-oid-callback';
import { googleOidRequestHandler } from './google-oid-request';
import { logoutHandler } from './logout';
import { tokenRenewalHandler } from './renew';

export const method = 'ANY';
export const handlerName = 'handler';
export const handler: APIHandler = withInstrumentation(
  {
    name: 'api.auth',
  },
  async (evt, ctx, cb): Promise<APIGatewayProxyStructuredResultV2 | undefined> => {
    const action = evt.pathParameters?.action;
    switch (action) {
      case 'authorize': {
        return (await googleOidRequestHandler(evt, ctx, cb)) as APIGatewayProxyStructuredResultV2;
      }
      case 'callback': {
        return (await googleOidCallbackHandler(evt, ctx, cb)) as APIGatewayProxyStructuredResultV2;
      }
      case 'renew': {
        return (await tokenRenewalHandler(evt, ctx, cb)) as APIGatewayProxyStructuredResultV2;
      }
      case 'logout': {
        return (await logoutHandler(evt, ctx, cb)) as APIGatewayProxyStructuredResultV2;
      }
    }
    return {
      statusCode: 404,
      body: JSON.stringify({ message: 'Not Found' }),
    } as APIGatewayProxyStructuredResultV2;
  }
);

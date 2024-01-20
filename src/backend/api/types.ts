import type {
	APIGatewayProxyEventV2,
	APIGatewayProxyStructuredResultV2,
	Handler,
} from 'aws-lambda';

export type APIHandler = Handler<
	APIGatewayProxyEventV2,
	APIGatewayProxyStructuredResultV2 | void
>;

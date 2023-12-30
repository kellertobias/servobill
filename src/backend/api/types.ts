import type {
	APIGatewayProxyEventV2,
	APIGatewayProxyStructuredResultV2,
	Context,
} from 'aws-lambda';

export type APIHandler = (
	event: APIGatewayProxyEventV2,
	context: Context,
) => Promise<APIGatewayProxyStructuredResultV2>;

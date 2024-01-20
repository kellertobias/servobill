import {
	APIGatewayProxyEventV2,
	Callback,
	Context,
	EventBridgeEvent,
	Handler,
} from 'aws-lambda';
import { AttributeValue, trace } from '@opentelemetry/api';

const tracer = trace.getTracer('lambda');

// Class Method Decorator
export function Span(
	spanName: string,
	attributes?: Record<string, AttributeValue>,
) {
	return function (
		target: unknown,
		propertyKey: string,
		descriptor: PropertyDescriptor,
	) {
		const originalMethod = descriptor.value;
		descriptor.value = async function (...args: unknown[]) {
			return tracer.startActiveSpan(spanName, async (span) => {
				if (attributes) {
					span.setAttributes(attributes);
				}
				const answer = await originalMethod.apply(this, args);
				return answer;
			});
		};
		return descriptor;
	};
}

export const withInstrumentation = <E, R>(
	tracerConfig: {
		name: string;
		onThrow?: (error: Error) => Awaited<R> | null;
	},
	handler: Handler<E, R>,
) => {
	return async (evt: E, ctx: Context, cb: Callback) => {
		return tracer.startActiveSpan(tracerConfig.name, async (span) => {
			span.setAttribute('lambda.name', ctx.functionName);
			span.setAttribute('lambda.version', ctx.functionVersion);
			span.setAttribute('lambda.memory', ctx.memoryLimitInMB);
			span.setAttribute('lambda.requestId', ctx.awsRequestId);
			span.setAttribute('lambda.remainintTime', ctx.getRemainingTimeInMillis());

			// If the handler is a API Gateway handler, we get the URL and Method:
			const apiGatewayEvent = evt as unknown as APIGatewayProxyEventV2;
			const eventHandlerEvent = evt as unknown as EventBridgeEvent<
				string,
				unknown
			>;
			if (apiGatewayEvent.requestContext) {
				span.setAttribute('lambda.handlerType', 'APIGateway');
				span.setAttribute(
					'http.method',
					apiGatewayEvent?.requestContext?.http?.method,
				);
				span.setAttribute(
					'http.path',
					apiGatewayEvent?.requestContext?.http?.path,
				);
				span.setAttribute(
					'http.protocol',
					apiGatewayEvent?.requestContext?.http?.protocol,
				);
				span.setAttribute(
					'http.sourceIp',
					apiGatewayEvent?.requestContext?.http?.sourceIp,
				);
				if (apiGatewayEvent?.requestContext?.http?.userAgent) {
					span.setAttribute(
						'http.userAgent',
						apiGatewayEvent?.requestContext?.http?.userAgent,
					);
				}
				span.setAttribute(
					'lambda.accountId',
					apiGatewayEvent?.requestContext?.accountId,
				);
			} else if (eventHandlerEvent['detail-type']) {
				span.setAttribute('lambda.handlerType', 'EventBridge');
				span.setAttribute('event.type', eventHandlerEvent['detail-type']);
				span.setAttribute('event.id', eventHandlerEvent.id);
				span.setAttribute('event.source', eventHandlerEvent.source);
				span.setAttribute(
					'event.detail',
					JSON.stringify(eventHandlerEvent.detail),
				);
				span.setAttribute('event.time', eventHandlerEvent.time);
				span.setAttribute('event.resources', eventHandlerEvent.resources);

				// Todo get traceId from event and set it as parent
			} else {
				span.setAttribute('lambda.handlerType', 'Unknown');
			}

			let answer: Awaited<R> | void;
			try {
				answer = await handler(evt, ctx, cb);
			} catch (error) {
				if (error instanceof Error) {
					span.recordException(error);
				} else {
					span.recordException(new Error(String(error)));
				}
				if (tracerConfig.onThrow) {
					const errorResult = tracerConfig.onThrow(
						error instanceof Error ? error : new Error(String(error)),
					);
					if (errorResult === null) {
						throw error;
					} else {
						answer = errorResult;
					}
				} else {
					throw error;
				}
			} finally {
				span.end();
			}
			return answer;
		});
	};
};

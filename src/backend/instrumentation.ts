import {
	APIGatewayProxyEventV2,
	Callback,
	Context,
	EventBridgeEvent,
	Handler,
} from 'aws-lambda';
import {
	AttributeValue,
	trace,
	SpanStatusCode,
	propagation,
	context,
} from '@opentelemetry/api';

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
				let answer: unknown;
				try {
					answer = await originalMethod.apply(this, args);
				} catch (error) {
					span.setStatus({ code: SpanStatusCode.ERROR });
					if (error instanceof Error) {
						span.recordException(error);
					} else {
						span.recordException(new Error(String(error)));
					}
					throw error;
				} finally {
					span.end();
				}
				return answer;
			});
		};
		return descriptor;
	};
}

const getActiveContext = <E>(evt: E) => {
	const apiGatewayEvent = evt as unknown as APIGatewayProxyEventV2;
	const eventHandlerEvent = evt as unknown as EventBridgeEvent<string, unknown>;

	if (apiGatewayEvent.requestContext) {
		return context.active();
	} else if (eventHandlerEvent['detail-type']) {
		const activeContext = propagation.extract(
			context.active(),
			(eventHandlerEvent.detail as undefined | { tracerContext: unknown })
				?.tracerContext,
		);
		return activeContext;
	} else {
		return context.active();
	}
};

export const withInstrumentation = <E, R>(
	tracerConfig: {
		name: string;
		onThrow?: (error: Error) => Awaited<R> | null;
	},
	handler: Handler<E, R | void>,
): Handler<E, R | void> => {
	return async (evt: E, ctx: Context, cb: Callback) => {
		const apiGatewayEvent = evt as unknown as APIGatewayProxyEventV2;
		const eventHandlerEvent = evt as unknown as EventBridgeEvent<
			string,
			unknown
		>;

		const activeContext = getActiveContext(evt);
		const span = tracer.startSpan(
			tracerConfig.name,
			{
				attributes: {},
			},
			activeContext,
		);

		span.setAttribute('faas.memory', ctx.memoryLimitInMB);
		span.setAttribute('faas.requestId', ctx.awsRequestId);
		span.setAttribute('faas.remainingTime', ctx.getRemainingTimeInMillis());
		span.setAttribute('process.runtime.version', process.version);
		span.setAttribute('process.runtime.arch', process.arch);
		span.setAttribute('process.runtime.name', process.release.name);
		// If the handler is a API Gateway handler, we get the URL and Method:

		if (apiGatewayEvent.requestContext) {
			span.setAttribute('faas.handlerType', 'APIGateway');
			span.setAttribute(
				'http.method',
				apiGatewayEvent?.requestContext?.http?.method,
			);
			span.setAttribute(
				'http.host',
				apiGatewayEvent?.requestContext?.domainName,
			);
			span.setAttribute(
				'http.target',
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
			span.setAttribute('faas.handlerType', 'EventBridge');
			span.setAttribute('event.type', eventHandlerEvent['detail-type']);
			span.setAttribute('event.id', eventHandlerEvent.id);
			span.setAttribute('event.source', eventHandlerEvent.source);
			span.setAttribute(
				'event.detail',
				JSON.stringify(eventHandlerEvent.detail),
			);
			span.setAttribute('event.time', eventHandlerEvent.time);
			span.setAttribute('event.resources', eventHandlerEvent.resources);
		} else {
			span.setAttribute('lambda.handlerType', 'Unknown');
		}

		trace.setSpan(activeContext, span);

		let answer: Awaited<R> | void;
		try {
			span.addEvent('start');
			answer = await handler(evt, ctx, cb);
		} catch (error) {
			span.setStatus({ code: SpanStatusCode.ERROR });
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
	};
};

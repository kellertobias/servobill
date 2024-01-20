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
	Span,
} from '@opentelemetry/api';

const tracer = trace.getTracer('lambda');

export function withSpan<A extends unknown[], R>(
	spanAttributes: { name: string },
	handler: (...args: A) => R,
): (...args: A) => R {
	return (...args: A) => {
		return tracer.startActiveSpan(spanAttributes.name, (span) => {
			span.setAttributes(spanAttributes);
			let answer: undefined | R;
			try {
				answer = handler(...args);
				if (answer instanceof Promise) {
					answer
						.then((value) => {
							span.end();
							return value;
						})
						.catch((error) => {
							span.setStatus({ code: SpanStatusCode.ERROR });
							if (error instanceof Error) {
								span.recordException(error);
							} else {
								span.recordException(new Error(String(error)));
							}
							span.end();
							throw error;
						});
				}
			} catch (error) {
				span.setStatus({ code: SpanStatusCode.ERROR });
				if (error instanceof Error) {
					span.recordException(error);
				} else {
					span.recordException(new Error(String(error)));
				}
				throw error;
			} finally {
				if (answer && !(answer instanceof Promise)) {
					span.end();
				}
			}
			return answer;
		});
	};
}

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

const withEventBridgeInstrumentation = async <
	E extends EventBridgeEvent<string, unknown>,
	R,
>(
	spanInfo: {
		name: string;
		attributes?: Record<string, AttributeValue>;
		onThrow?: (error: Error) => Awaited<R> | null;
	},
	handler: Handler<E, R | void>,
	[evt, ctx, cb]: Parameters<Handler<E, R | void>>,
): Promise<R | void> => {
	const activeContext = getActiveContext(evt);
	const span = tracer.startSpan(
		spanInfo.name,
		{
			attributes: {
				...spanInfo.attributes,
				'faas.handlerType': 'EventBridge',
				'event.type': evt['detail-type'],
				'event.id': evt.id,
				'event.source': evt.source,
				'event.detail': JSON.stringify(evt.detail),
				'event.time': evt.time,
				'event.resources': evt.resources,
			},
		},
		activeContext,
	);
	trace.setSpan(activeContext, span);

	return handler(evt, ctx, cb);
};

const withApiGatewayInstrumentation = async <
	E extends APIGatewayProxyEventV2,
	R,
>(
	spanInfo: {
		name: string;
		attributes?: Record<string, AttributeValue>;
		onThrow?: (error: Error) => Awaited<R> | null;
	},
	handler: Handler<E, R | void>,
	[evt, ctx, cb]: Parameters<Handler<E, R | void>>,
): Promise<R | void> => {
	return tracer.startActiveSpan(spanInfo.name, async (span) => {
		if (spanInfo.attributes) {
			span.setAttributes({
				...spanInfo.attributes,
				'faas.handlerType': 'APIGateway',
				'http.method': evt?.requestContext?.http?.method,
				'http.host': evt?.requestContext?.domainName,
				'http.target': evt?.requestContext?.http?.path,
				'http.protocol': evt?.requestContext?.http?.protocol,
				'http.sourceIp': evt?.requestContext?.http?.sourceIp,
				'http.userAgent': evt?.requestContext?.http?.userAgent,
				'lambda.accountId': evt?.requestContext?.accountId,
			});
		}
		return await handleSpanExecution(
			{ span, onThrow: spanInfo.onThrow },
			handler,
			[evt, ctx, cb],
		);
	});
};

const handleSpanExecution = async <E, R>(
	{
		span,
		onThrow,
	}: {
		span: Span;
		onThrow?: (error: Error) => Awaited<R> | null;
	},
	handler: Handler<E, R | void>,
	[evt, ctx, cb]: Parameters<Handler<E, R | void>>,
): Promise<R | void> => {
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
		if (onThrow) {
			const errorResult = onThrow(
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

const withWrappedInstrumentation = <E, R>(
	spanInfo: {
		name: string;
		attributes?: Record<string, AttributeValue>;
		onThrow?: (error: Error) => Awaited<R> | null;
	},
	handler: Handler<E, R | void>,
	args: Parameters<Handler<E, R | void>>,
): Promise<R | void> => {
	return tracer.startActiveSpan(spanInfo.name, (span) => {
		if (spanInfo.attributes) {
			span.setAttributes(spanInfo.attributes);
		}
		return handleSpanExecution(
			{ span, onThrow: spanInfo.onThrow },
			handler,
			args,
		);
	});
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

		const attributes: Record<string, AttributeValue> = {
			'faas.memory': ctx.memoryLimitInMB,
			'faas.requestId': ctx.awsRequestId,
			'faas.remainingTime': ctx.getRemainingTimeInMillis(),
			'process.runtime.version': process.version,
			'process.runtime.arch': process.arch,
			'process.runtime.name': process.release.name,
		};

		if (apiGatewayEvent.requestContext) {
			return withApiGatewayInstrumentation(
				{
					...tracerConfig,
					attributes,
				},
				handler as Handler<APIGatewayProxyEventV2, R>,
				[apiGatewayEvent, ctx, cb],
			);
		} else if (eventHandlerEvent['detail-type']) {
			return withEventBridgeInstrumentation(
				{
					...tracerConfig,
					attributes,
				},
				handler as Handler<EventBridgeEvent<string, unknown>, R>,
				[eventHandlerEvent, ctx, cb],
			);
		} else {
			return withWrappedInstrumentation(
				{
					...tracerConfig,
					attributes: {
						...attributes,
						'lambda.handlerType': 'Unknown',
					},
				},
				handler,
				[evt, ctx, cb],
			);
		}
	};
};

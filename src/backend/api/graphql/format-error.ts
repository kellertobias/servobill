import { trace } from '@opentelemetry/api';
import chalk from 'chalk';
import type { ValidationError } from 'class-validator';
import type { GraphQLError, GraphQLFormattedError } from 'graphql';

import { Logger } from '@/backend/services/logger.service';

const tracer = trace.getTracer('graphql');
const logger = new Logger('GraphQLServer');

/**
 * ApolloServer formatError function for consistent error formatting.
 *
 * - Handles session expiration with a custom code.
 * - Surfaces validation errors (including ElectroValidationError) to the client with details.
 * - Logs and traces errors for observability.
 * - Returns internal server errors only for truly unexpected cases.
 *
 * @param {GraphQLError} error - The error object from ApolloServer.
 * @returns {GraphQLFormattedError} - The formatted error to send to the client.
 */
export function formatError(error: GraphQLError): GraphQLFormattedError {
	// Special handling for session expiration
	if (
		error.extensions?.exception?.stacktrace?.[0]?.includes(
			'Session Expired - Refreshable',
		)
	) {
		return {
			message: 'Session Expired - Refreshable',
			extensions: {
				code: 'SESSION_EXPIRED_REFRESHABLE',
			},
		};
	}

	return tracer.startActiveSpan('formatError', (span) => {
		const { code, exception } = (error?.extensions || {
			code: 'UNKNOWN',
			exception: {},
		}) as {
			code: string;
			exception?: {
				validationErrors?: ValidationError[];
				stacktrace?: string[];
				name?: string;
				isElectroError?: boolean;
				fields?: unknown[];
				message?: string;
			};
		};

		span.setAttribute('code', code);

		logger.warn('GraphQL Error', {
			error,
			code,
			nodeEnv: process.env.NODE_ENV,
		});

		// Handle class-validator validation errors
		if (
			exception?.validationErrors ||
			error.extensions?.code === 'GRAPHQL_VALIDATION_ERROR'
		) {
			const message = exception?.validationErrors
				? `Input Data Validation Failed\n${exception.validationErrors
						.map(
							(e) =>
								`- ${e.target?.constructor?.name} ${
									e.constraints?.[Object.keys(e.constraints)[0]]
								} (${`${e.value?.toString?.()}`.slice(0, 10)}...) }`,
						)
						.join('\n')}`
				: String(error.message);

			if (process.env.NODE_ENV !== 'production') {
				console.log(chalk.yellow(message));
			}

			span.setAttribute('type', 'VALIDATION_ERROR');
			span.end();
			return {
				message,
				locations: error.locations,
				path: error.path,
				extensions: {
					code: 'VALIDATION_ERROR',
					validationErrors: exception?.validationErrors,
				},
			};
		}

		// Handle ElectroValidationError and similar custom validation errors
		if (
			exception?.name === 'ElectroValidationError' ||
			(exception?.isElectroError && exception?.fields)
		) {
			// Prefer the error.message, then exception.message, then fallback
			const electroMessage =
				error.message || exception.message || 'Validation error';
			if (process.env.NODE_ENV !== 'production') {
				console.log(chalk.yellow(electroMessage));
			}
			span.setAttribute('type', 'ELECTRO_VALIDATION_ERROR');
			span.end();
			return {
				message: electroMessage,
				locations: error.locations,
				path: error.path,
				extensions: {
					code: 'ELECTRO_VALIDATION_ERROR',
					fields: exception.fields,
					stacktrace: exception.stacktrace,
					name: exception.name,
					isElectroError: true,
				},
			};
		}

		// Handle generic internal server errors
		if (code === 'INTERNAL_SERVER_ERROR') {
			if (process.env.NODE_ENV !== 'production') {
				const stack = error.extensions?.exception?.stacktrace;
				if (Array.isArray(stack)) {
					console.log(chalk.red(stack.join('\n')));
				}
			}
			span.setAttribute('type', 'INTERNAL_SERVER_ERROR');
			span.end();
			// Still throw, but do not swallow details in dev
			throw new Error('Internal server error');
		}

		// Default: return the error as-is
		span.end();
		return error;
	});
}

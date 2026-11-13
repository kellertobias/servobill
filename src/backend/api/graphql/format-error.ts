import { unwrapResolverError } from '@apollo/server/errors';
import { trace } from '@opentelemetry/api';
import chalk from 'chalk';
import type { ValidationError } from 'class-validator';
import type { GraphQLFormattedError } from 'graphql';

import { Logger } from '@/backend/services/logger.service';

const tracer = trace.getTracer('graphql');
const logger = new Logger('GraphQLServer');

type ElectroLikeError = Error & {
	isElectroError?: boolean;
	fields?: unknown[];
};

/**
 * ApolloServer formatError function for consistent error formatting.
 *
 * - Handles session expiration with a custom code.
 * - Surfaces validation errors (including ElectroValidationError) to the client with details.
 * - Logs and traces errors for observability.
 * - Hides the details of unexpected errors from the client.
 *
 * @param formattedError - The error as Apollo would send it to the client.
 * @param error - The original error, possibly wrapped in a GraphQLError.
 * @returns The formatted error to send to the client.
 */
export function formatError(
	formattedError: GraphQLFormattedError,
	error: unknown,
): GraphQLFormattedError {
	const original = unwrapResolverError(error) as ElectroLikeError | undefined;

	// Special handling for session expiration
	if (original?.message?.includes('Session Expired - Refreshable')) {
		return {
			message: 'Session Expired - Refreshable',
			extensions: {
				code: 'SESSION_EXPIRED_REFRESHABLE',
			},
		};
	}

	return tracer.startActiveSpan('formatError', (span) => {
		const extensions = formattedError.extensions || {};
		const code = String(extensions.code || 'UNKNOWN');
		const validationErrors = extensions.validationErrors as
			| ValidationError[]
			| undefined;

		span.setAttribute('code', code);

		logger.warn('GraphQL Error', {
			error: original ?? formattedError,
			code,
			nodeEnv: process.env.NODE_ENV,
		});

		// Handle class-validator validation errors
		if (validationErrors || code === 'GRAPHQL_VALIDATION_FAILED') {
			const message = validationErrors
				? `Input Data Validation Failed\n${validationErrors
						.map(
							(e) =>
								`- ${e.target?.constructor?.name ?? e.property} ${
									e.constraints?.[Object.keys(e.constraints)[0]]
								} (${`${e.value?.toString?.()}`.slice(0, 10)}...) }`,
						)
						.join('\n')}`
				: formattedError.message;

			if (process.env.NODE_ENV !== 'production') {
				console.log(chalk.yellow(message));
			}

			span.setAttribute('type', 'VALIDATION_ERROR');
			span.end();
			return {
				message,
				locations: formattedError.locations,
				path: formattedError.path,
				extensions: {
					code: 'VALIDATION_ERROR',
					validationErrors,
				},
			};
		}

		// Handle ElectroValidationError and similar custom validation errors
		if (
			original?.name === 'ElectroValidationError' ||
			(original?.isElectroError && original?.fields)
		) {
			const electroMessage = original.message || 'Validation error';
			if (process.env.NODE_ENV !== 'production') {
				console.log(chalk.yellow(electroMessage));
			}
			span.setAttribute('type', 'ELECTRO_VALIDATION_ERROR');
			span.end();
			return {
				message: electroMessage,
				locations: formattedError.locations,
				path: formattedError.path,
				extensions: {
					code: 'ELECTRO_VALIDATION_ERROR',
					fields: original.fields,
					name: original.name,
					isElectroError: true,
				},
			};
		}

		// Handle generic internal server errors
		if (code === 'INTERNAL_SERVER_ERROR') {
			if (process.env.NODE_ENV !== 'production' && original?.stack) {
				console.log(chalk.red(original.stack));
			}
			span.setAttribute('type', 'INTERNAL_SERVER_ERROR');
			span.end();
			return {
				message: 'Internal server error',
				locations: formattedError.locations,
				path: formattedError.path,
				extensions: { code: 'INTERNAL_SERVER_ERROR' },
			};
		}

		// Default: return the error as Apollo formatted it
		span.end();
		return formattedError;
	});
}

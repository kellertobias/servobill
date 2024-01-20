/* eslint-disable @typescript-eslint/no-explicit-any */
import { TypedDocumentNode } from '@graphql-typed-document-node/core';

import { connection, restConnection } from './graphql-connection';
import { handleGqlError, revalidateOnError } from './graphql-error-handling';

import { gql as origTypedGql, DocumentType } from '@/common/gql';
import { DeferredPromise } from '@/common/deferred';

type GQLHelper = typeof origTypedGql;

export const gql: GQLHelper = (query) => query as never;

const resolvedDeferredPromise = new DeferredPromise();
resolvedDeferredPromise.resolve();
const waitForRenewal: {
	renewing: boolean;
	current: DeferredPromise;
	failed?: Error | unknown;
} = {
	renewing: false,
	current: resolvedDeferredPromise,
};

const isExpiredError = (error: unknown): boolean => {
	if (!(error instanceof Error)) {
		return false;
	}
	try {
		const errorDecoded = JSON.parse((error as any).response.error);
		if (errorDecoded.renewable) {
			return true;
		}
	} catch {
		if (String(error).includes('Session Expired - Refreshable')) {
			return true;
		}

		return false;
	}
	return false;
};

export const renewSessionToken = async () => {
	if (waitForRenewal.failed) {
		// eslint-disable-next-line no-console
		console.log(
			'Attempting to renew Token ... last renewing failed. Aborting.',
		);
		throw waitForRenewal.failed;
	}

	if (waitForRenewal.renewing) {
		// eslint-disable-next-line no-console
		console.log('Attempting to renew Token ...already renewing');
		return;
	}

	waitForRenewal.current = new DeferredPromise();
	waitForRenewal.renewing = true;

	try {
		// eslint-disable-next-line no-console
		console.log('Attempting to renew Token ...Renewing session token...');
		const response = await restConnection.get('/api/auth/renew');
		// eslint-disable-next-line no-console
		console.log(response);
		waitForRenewal.renewing = false;
		waitForRenewal.current.resolve();
		// eslint-disable-next-line no-console
		console.log('...done');
	} catch (error) {
		waitForRenewal.renewing = false;
		waitForRenewal.current.resolve();
		waitForRenewal.failed = error;
		// eslint-disable-next-line no-console
		console.log('...failed with', error);
		throw error;
	}
};

export const query = async <T extends TypedDocumentNode<any, any>>(
	params:
		| T
		| {
				query: T;
				variables?: Record<string, unknown>;
		  },
): Promise<DocumentType<T>> => {
	await waitForRenewal.current.promise;
	const { query: gqlQuery, variables } = (
		params as unknown as { query: string }
	).query
		? (params as unknown as {
				query: string;
				variables?: Record<string, unknown>;
			})
		: { query: params as unknown as string, variables: {} };
	const data = await connection
		.request({
			document: gqlQuery,
			variables,
		})
		.catch(async (error: unknown) => {
			// Check if is renewal error
			if (isExpiredError(error)) {
				renewSessionToken();
				return query(params);
			}

			await revalidateOnError();

			if (String(error).startsWith('Unexpected token < in JSON')) {
				// eslint-disable-next-line no-console
				console.error(error);
				throw new Error('API Result was no GraphQL Message');
			}

			if (!(error instanceof Error)) {
				throw error;
			}

			handleGqlError(error, gqlQuery, variables);
		});

	return data as DocumentType<T>;
};

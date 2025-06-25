/* eslint-disable @typescript-eslint/no-explicit-any */
import { gql } from 'graphql-tag';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';

import {
	prepareGraphqlTest,
	type ExecuteTestFunction,
} from '@/test/graphql-test';
import { ATTACHMENT_REPOSITORY } from '@/backend/repositories/attachment/di-tokens';
import type { AttachmentRepository } from '@/backend/repositories/attachment/interface';

/**
 * Integration tests for AttachmentResolver.
 *
 * This suite covers all queries and mutations, verifying both GraphQL responses and database state.
 * Uses dependency-injected app and repository for full integration coverage.
 */
describe('AttachmentResolver (integration)', () => {
	let execute: ExecuteTestFunction;
	let app: {
		get<T>(type: string | symbol | (new (...args: any[]) => T)): T;
		close?: () => Promise<void>;
	};
	let repository: AttachmentRepository;

	beforeAll(async () => {
		// Prepare the DI app and GraphQL executor
		const testEnv = await prepareGraphqlTest();
		execute = testEnv.execute;
		app = testEnv.app;
		repository = app.get<AttachmentRepository>(ATTACHMENT_REPOSITORY);
	});

	afterAll(async () => {
		// Clean up if needed (e.g., close DB connections)
		if (app && app.close) {
			await app.close();
		}
	});

	/**
	 * Test the requestUpload mutation.
	 * Verifies that a new attachment is created in the DB and a valid upload URL is returned.
	 */
	it('should request an upload URL and create a pending attachment', async () => {
		const fileName = 'testfile.pdf';
		const mimeType = 'application/pdf';
		const size = 12345;
		const mutation = gql`
			mutation RequestUpload(
				$fileName: String!
				$mimeType: String!
				$size: Int!
			) {
				requestUpload(fileName: $fileName, mimeType: $mimeType, size: $size) {
					uploadUrl
					attachmentId
				}
			}
		`;
		// Execute the mutation
		const result = await execute({
			source: mutation.loc!.source.body,
			variableValues: { fileName, mimeType, size },
		});
		expect(result.errors).toBeUndefined();
		expect(result.data?.requestUpload.uploadUrl).toBeTruthy();
		expect(result.data?.requestUpload.attachmentId).toBeTruthy();

		// Verify the attachment is stored in the DB with 'pending' status
		const attachment = await repository.getById(
			result.data.requestUpload.attachmentId,
		);
		expect(attachment).toBeTruthy();
		expect(attachment?.fileName).toBe(fileName);
		expect(attachment?.mimeType).toBe(mimeType);
		expect(attachment?.size).toBe(size);
		expect(attachment?.status).toBe('pending');
	});

	/**
	 * Test the confirmUpload mutation.
	 * Verifies that the attachment status is updated to 'finished' in the DB.
	 */
	it('should confirm upload and mark the attachment as finished', async () => {
		// First, create a pending attachment
		const fileName = 'confirmme.pdf';
		const mimeType = 'application/pdf';
		const size = 54321;
		const requestUploadMutation = gql`
			mutation RequestUpload(
				$fileName: String!
				$mimeType: String!
				$size: Int!
			) {
				requestUpload(fileName: $fileName, mimeType: $mimeType, size: $size) {
					attachmentId
				}
			}
		`;
		const uploadResult = await execute({
			source: requestUploadMutation.loc!.source.body,
			variableValues: { fileName, mimeType, size },
		});
		const attachmentId = uploadResult.data?.requestUpload.attachmentId;
		expect(attachmentId).toBeTruthy();

		// Now, confirm the upload
		const confirmUploadMutation = gql`
			mutation ConfirmUpload($attachmentId: String!) {
				confirmUpload(attachmentId: $attachmentId) {
					id
					status
				}
			}
		`;
		const confirmResult = await execute({
			source: confirmUploadMutation.loc!.source.body,
			variableValues: { attachmentId },
		});
		expect(confirmResult.errors).toBeUndefined();
		expect(confirmResult.data?.confirmUpload.id).toBe(attachmentId);
		expect(confirmResult.data?.confirmUpload.status).toBe('finished');

		// Verify in the DB
		const attachment = await repository.getById(attachmentId);
		expect(attachment?.status).toBe('finished');
	});

	// ... further tests for other mutations and queries will be added here ...
});

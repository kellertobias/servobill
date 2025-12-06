/* eslint-disable @typescript-eslint/no-explicit-any */
import { gql } from 'graphql-tag';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ATTACHMENT_REPOSITORY } from '@/backend/repositories/attachment/di-tokens';
import type { AttachmentRepository } from '@/backend/repositories/attachment/interface';
import { type ExecuteTestFunction, prepareGraphqlTest } from '@/test/graphql-test';

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
    if (app?.close) {
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
    const attachment = await repository.getById(result.data.requestUpload.attachmentId);
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

  /**
   * Test the attachUpload mutation.
   * Verifies that an attachment can be attached to an invoice, expense, or inventory, and status is updated.
   */
  it('should attach an upload to an invoice and mark as attached', async () => {
    // Create a pending attachment
    const fileName = 'attachme.pdf';
    const mimeType = 'application/pdf';
    const size = 11111;
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
    const invoiceId = 'test-invoice-id';

    // Attach to invoice
    const attachUploadMutation = gql`
			mutation AttachUpload($attachmentId: String!, $invoiceId: String) {
				attachUpload(attachmentId: $attachmentId, invoiceId: $invoiceId) {
					id
					status
					invoiceId
				}
			}
		`;
    const attachResult = await execute({
      source: attachUploadMutation.loc!.source.body,
      variableValues: { attachmentId, invoiceId },
    });
    expect(attachResult.errors).toBeUndefined();
    expect(attachResult.data?.attachUpload.id).toBe(attachmentId);
    expect(attachResult.data?.attachUpload.status).toBe('attached');
    expect(attachResult.data?.attachUpload.invoiceId).toBe(invoiceId);

    // Verify in DB
    const attachment = await repository.getById(attachmentId);
    expect(attachment?.status).toBe('attached');
    expect(attachment?.invoiceId).toBe(invoiceId);
  });

  /**
   * Negative test for attachUpload: invalid attachmentId.
   */
  it('should fail to attachUpload with invalid attachmentId', async () => {
    const attachUploadMutation = gql`
			mutation AttachUpload($attachmentId: String!, $invoiceId: String) {
				attachUpload(attachmentId: $attachmentId, invoiceId: $invoiceId) {
					id
				}
			}
		`;
    const result = await execute({
      source: attachUploadMutation.loc!.source.body,
      variableValues: { attachmentId: 'nonexistent', invoiceId: 'test' },
    });
    expect(result.errors).toBeTruthy();
  });

  /**
   * Test the deleteAttachment mutation.
   * Verifies that an attachment can be deleted and is removed from the DB.
   */
  it('should delete an attachment and remove it from the DB', async () => {
    // Create a pending attachment
    const fileName = 'deleteme.pdf';
    const mimeType = 'application/pdf';
    const size = 22222;
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

    // Delete the attachment
    const deleteAttachmentMutation = gql`
			mutation DeleteAttachment($attachmentId: String!) {
				deleteAttachment(attachmentId: $attachmentId)
			}
		`;
    const deleteResult = await execute({
      source: deleteAttachmentMutation.loc!.source.body,
      variableValues: { attachmentId },
    });
    expect(deleteResult.errors).toBeFalsy();
    expect(deleteResult.data?.deleteAttachment).toBe(true);

    // Verify in DB
    const attachment = await repository.getById(attachmentId);
    expect(attachment).toBeFalsy();
  });

  /**
   * Negative test for deleteAttachment: invalid attachmentId.
   */
  it('should return false when deleting a non-existent attachment', async () => {
    const deleteAttachmentMutation = gql`
			mutation DeleteAttachment($attachmentId: String!) {
				deleteAttachment(attachmentId: $attachmentId)
			}
		`;
    const result = await execute({
      source: deleteAttachmentMutation.loc!.source.body,
      variableValues: { attachmentId: 'nonexistent' },
    });
    expect(result.errors).toBeFalsy();
    expect(result.data?.deleteAttachment).toBe(false);
  });

  /**
   * Test the attachments query (listing).
   * Verifies that attachments can be listed by invoiceId, expenseId, or inventoryId.
   */
  it('should list attachments by invoiceId', async () => {
    // Step 1: Create a customer
    const createCustomerMutation = gql`
			mutation CreateCustomer($data: CustomerInput!) {
				createCustomer(data: $data) {
					id
					name
				}
			}
		`;
    const customerName = 'Test Customer';
    const customerResult = await execute({
      source: createCustomerMutation.loc!.source.body,
      variableValues: { data: { name: customerName, showContact: false } },
    });
    const customerId = customerResult.data?.createCustomer.id;
    expect(customerId).toBeTruthy();

    // Step 2: Create an invoice for the customer
    const createInvoiceMutation = gql`
			mutation CreateInvoice($customerId: String!) {
				createInvoice(customerId: $customerId) {
					id
				}
			}
		`;
    const invoiceResult = await execute({
      source: createInvoiceMutation.loc!.source.body,
      variableValues: { customerId },
    });
    const invoiceId = invoiceResult.data?.createInvoice.id;
    expect(invoiceId).toBeTruthy();

    // Step 3: Create and attach an attachment to the invoice
    const fileName = 'listme.pdf';
    const mimeType = 'application/pdf';
    const size = 33333;
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
    const attachUploadMutation = gql`
			mutation AttachUpload($attachmentId: String!, $invoiceId: String) {
				attachUpload(attachmentId: $attachmentId, invoiceId: $invoiceId) {
					id
				}
			}
		`;
    await execute({
      source: attachUploadMutation.loc!.source.body,
      variableValues: { attachmentId, invoiceId },
    });

    // Step 4: List attachments by invoiceId
    const attachmentsQuery = gql`
			query Attachments($input: ListAttachmentsInput) {
				attachments(input: $input) {
					id
					fileName
				}
			}
		`;
    const listResult = await execute({
      source: attachmentsQuery.loc!.source.body,
      variableValues: { input: { invoiceId } },
    });
    expect(listResult.errors).toBeFalsy();
    expect(listResult.data?.attachments).toBeInstanceOf(Array);
    expect(listResult.data?.attachments.length).toBeGreaterThan(0);
    const found = listResult.data.attachments.find((a: any) => a.id === attachmentId);
    expect(found).toBeTruthy();
    expect(found.fileName).toBe(fileName);
  });

  /**
   * Test the attachment query (download URL).
   * Verifies that a download URL is returned for a valid attachment.
   */
  it('should return a download URL for a valid attachment', async () => {
    // Create a pending attachment
    const fileName = 'downloadme.pdf';
    const mimeType = 'application/pdf';
    const size = 44444;
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

    // Query for download URL
    const attachmentQuery = gql`
			query Attachment($attachmentId: String!) {
				attachment(attachmentId: $attachmentId) {
					downloadUrl
				}
			}
		`;
    const result = await execute({
      source: attachmentQuery.loc!.source.body,
      variableValues: { attachmentId },
    });
    expect(result.errors).toBeFalsy();
    expect(result.data?.attachment.downloadUrl).toBeTruthy();
  });

  /**
   * Negative test for attachment query: invalid attachmentId.
   */
  it('should fail to return a download URL for a non-existent attachment', async () => {
    const attachmentQuery = gql`
			query Attachment($attachmentId: String!) {
				attachment(attachmentId: $attachmentId) {
					downloadUrl
				}
			}
		`;
    const result = await execute({
      source: attachmentQuery.loc!.source.body,
      variableValues: { attachmentId: 'nonexistent' },
    });
    expect(result.errors).toBeTruthy();
  });
});

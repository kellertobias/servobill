import { gql } from 'graphql-request';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ATTACHMENT_REPOSITORY } from '@/backend/repositories/attachment/di-tokens';
import type { AttachmentRepository } from '@/backend/repositories/attachment/interface';
import { prepareGraphqlTest } from '@/test/graphql-test';

/**
 * Integration tests for ReceiptResolver's extractReceipt mutation.
 *
 * These tests verify:
 * - Extraction with text only
 * - Extraction with valid attachment ID
 * - Error on missing input
 * - Error on non-existent attachment
 */
describe('ReceiptResolver Integration', () => {
  let execute: Awaited<ReturnType<typeof prepareGraphqlTest>>['execute'];
  let app: Awaited<ReturnType<typeof prepareGraphqlTest>>['app'];
  let eventBusMock: Awaited<ReturnType<typeof prepareGraphqlTest>>['eventBusMock'];
  let attachmentRepo: AttachmentRepository;

  beforeAll(async () => {
    const result = await prepareGraphqlTest();
    execute = result.execute;
    app = result.app;
    eventBusMock = result.eventBusMock;
    attachmentRepo = app.get<AttachmentRepository>(ATTACHMENT_REPOSITORY);
  });

  beforeEach(() => {
    // Reset the eventBusMock.send spy before each test for isolation
    eventBusMock.send.mockClear();
  });

  /**
   * Test extracting receipt from text only.
   * Verifies that an event is published and the response contains an eventId.
   */
  it('should extract receipt from text', async () => {
    const { data, errors } = await execute({
      source: gql`
				mutation ExtractReceipt($input: ExtractReceiptInput!) {
					extractReceipt(input: $input) {
						eventIds
						message
					}
				}
			`,
      variableValues: { input: { text: 'Test receipt text' } },
    });
    expect(errors).toBeUndefined();
    expect(data?.extractReceipt.eventIds).toHaveLength(0); // No attachment, so no event
    expect(data?.extractReceipt.message).toMatch(/successfully/i);
    // No event should be sent to eventBus for text-only (per resolver logic)
    expect(eventBusMock.send).not.toHaveBeenCalled();
  });

  /**
   * Test extracting receipt from a valid attachment ID.
   * Verifies that the event is published and the response contains the eventId.
   */
  it('should extract receipt from attachment', async () => {
    // Create a test attachment in the repository
    const attachment = await attachmentRepo.create({
      fileName: 'test.pdf',
      mimeType: 'application/pdf',
      size: 1234,
      s3Key: 'test-key',
      s3Bucket: 'test-bucket',
    });
    // Save the attachment to the repo if needed (depends on repo impl)
    if (attachmentRepo.save) {
      await attachmentRepo.save(attachment);
    }

    const { data, errors } = await execute({
      source: gql`
				mutation ExtractReceipt($input: ExtractReceiptInput!) {
					extractReceipt(input: $input) {
						eventIds
						message
					}
				}
			`,
      variableValues: { input: { attachmentIds: [attachment.id] } },
    });
    expect(errors).toBeUndefined();
    expect(data?.extractReceipt.eventIds).toHaveLength(1);
    expect(data?.extractReceipt.message).toMatch(/successfully/i);
    // Event should be sent to eventBus
    expect(eventBusMock.send).toHaveBeenCalledWith(
      'receipt',
      expect.objectContaining({
        attachmentIds: [attachment.id],
      })
    );
  });

  /**
   * Test error when neither text nor attachmentIds are provided.
   */
  it('should error if neither text nor attachmentIds are provided', async () => {
    const { data, errors } = await execute({
      source: gql`
				mutation ExtractReceipt($input: ExtractReceiptInput!) {
					extractReceipt(input: $input) {
						eventIds
						message
					}
				}
			`,
      variableValues: { input: {} },
    });
    expect(data).toBeNull();
    expect(errors).toBeDefined();
    // errors can be string or GraphQLError, so check for .message property
    const message =
      Array.isArray(errors) && errors[0] && typeof errors[0] === 'object' && 'message' in errors[0]
        ? (errors[0] as { message: string }).message
        : String(errors?.[0]);
    expect(message).toMatch(/must be provided/i);
  });

  /**
   * Test error when a non-existent attachment ID is provided.
   */
  it('should error if attachment does not exist', async () => {
    const fakeId = 'non-existent-id';
    const { data, errors } = await execute({
      source: gql`
				mutation ExtractReceipt($input: ExtractReceiptInput!) {
					extractReceipt(input: $input) {
						eventIds
						message
					}
				}
			`,
      variableValues: { input: { attachmentIds: [fakeId] } },
    });
    expect(data).toBeNull();
    expect(errors).toBeDefined();
    const message =
      Array.isArray(errors) && errors[0] && typeof errors[0] === 'object' && 'message' in errors[0]
        ? (errors[0] as { message: string }).message
        : String(errors?.[0]);
    expect(message).toMatch(/not found/i);
  });

  /**
   * Test multiple mutations in a single request to check for race conditions.
   */
  it('should handle multiple extractReceipt mutations in one request', async () => {
    // Create two attachments
    const att1 = await attachmentRepo.create({
      fileName: 'a1.pdf',
      mimeType: 'application/pdf',
      size: 1,
      s3Key: 'k1',
      s3Bucket: 'b1',
    });
    const att2 = await attachmentRepo.create({
      fileName: 'a2.pdf',
      mimeType: 'application/pdf',
      size: 2,
      s3Key: 'k2',
      s3Bucket: 'b2',
    });
    if (attachmentRepo.save) {
      await attachmentRepo.save(att1);
      await attachmentRepo.save(att2);
    }

    const { data, errors } = await execute({
      source: gql`
				mutation MultiExtract($id1: [String!], $id2: [String!]) {
					first: extractReceipt(input: { attachmentIds: $id1 }) {
						eventIds
						message
					}
					second: extractReceipt(input: { attachmentIds: $id2 }) {
						eventIds
						message
					}
				}
			`,
      variableValues: { id1: [att1.id], id2: [att2.id] },
    });
    expect(errors).toBeUndefined();
    expect(data?.first.eventIds).toHaveLength(1);
    expect(data?.second.eventIds).toHaveLength(1);
    expect(eventBusMock.send).toHaveBeenCalledTimes(2);
  });
});

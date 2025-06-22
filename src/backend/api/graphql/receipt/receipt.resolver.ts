import { randomUUID } from 'crypto';

import { Resolver, Mutation, Arg, Authorized } from 'type-graphql';

import { ExtractReceiptInput, ExtractReceiptResult } from './receipt.schema';

import { Inject, Service } from '@/common/di';
import { ATTACHMENT_REPOSITORY } from '@/backend/repositories/attachment/di-tokens';
import { type AttachmentRepository } from '@/backend/repositories/attachment/interface';
import { EventBusService } from '@/backend/services/eventbus.service';
import { Logger } from '@/backend/services/logger.service';

/**
 * GraphQL resolver for processing receipts and triggering receipt extraction events.
 *
 * This resolver handles receipt processing by either:
 * 1. Extracting data from provided text content
 * 2. Processing an uploaded attachment (image/PDF) for receipt data extraction
 *
 * The resolver publishes receipt events that are handled asynchronously by the receipt event handler,
 * which uses LLM services to extract structured expense data from receipts.
 */
@Service()
@Resolver()
export class ReceiptResolver {
	private readonly logger = new Logger('ReceiptResolver');

	constructor(
		@Inject(ATTACHMENT_REPOSITORY)
		private attachmentRepository: AttachmentRepository,
		@Inject(EventBusService) private eventBus: EventBusService,
	) {}

	/**
	 * Extract receipt data from text content or uploaded attachment.
	 *
	 * This mutation triggers a receipt processing event that will:
	 * - Classify the receipt type (digital invoice vs regular receipt)
	 * - Extract expense information using LLM services
	 * - Create expense records in the database
	 *
	 * @param input - Contains either text content or attachment ID for processing
	 * @returns Event ID and confirmation message
	 */
	@Authorized()
	@Mutation(() => ExtractReceiptResult)
	async extractReceipt(
		@Arg('input', () => ExtractReceiptInput) input: ExtractReceiptInput,
	): Promise<ExtractReceiptResult> {
		const eventId = randomUUID();

		this.logger.info('Processing receipt extraction request', {
			eventId,
			hasText: !!input.text,
			hasAttachmentId: !!input.attachmentId,
		});

		// Validate input - must have either text or attachment
		if (!input.text && !input.attachmentId) {
			throw new Error('Either text or attachmentId must be provided');
		}

		let attachmentKey: string | undefined;
		let attachmentBucket: string | undefined;

		// If attachment ID is provided, get attachment details
		if (input.attachmentId) {
			const attachment = await this.attachmentRepository.getById(
				input.attachmentId,
			);
			if (!attachment) {
				throw new Error('Attachment not found');
			}

			attachmentKey = attachment.s3Key;
			attachmentBucket = attachment.s3Bucket;
		}

		// Create receipt event payload
		const receiptEvent = {
			id: eventId,
			attachmentKey,
			attachmentBucket,
			emailText: input.text,
		};

		// Publish receipt event to event bus
		const publishedEventId = await this.eventBus.send('receipt', receiptEvent, {
			source: 'graphql.receipt',
			resources: input.attachmentId ? [input.attachmentId] : [],
		});

		this.logger.info('Receipt event published successfully', {
			eventId,
			publishedEventId,
			attachmentKey,
		});

		return {
			eventId: publishedEventId || eventId,
			message:
				'Receipt processing started successfully. The extraction will be processed asynchronously.',
		};
	}
}

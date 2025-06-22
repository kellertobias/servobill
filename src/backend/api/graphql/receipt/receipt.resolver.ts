import { randomUUID } from 'crypto';

import { Resolver, Mutation, Arg, Authorized } from 'type-graphql';

import { ExtractReceiptResult } from './receipt.schema';

import { Inject, Service } from '@/common/di';
import { ATTACHMENT_REPOSITORY } from '@/backend/repositories/attachment/di-tokens';
import { type AttachmentRepository } from '@/backend/repositories/attachment/interface';
import { EventBusService } from '@/backend/services/eventbus.service';
import { Logger } from '@/backend/services/logger.service';
import { Span } from '@/backend/instrumentation';

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
	 * Extract receipt data from text content or uploaded attachments.
	 *
	 * This mutation triggers a receipt processing event that will:
	 * - Classify the receipt type (digital invoice vs regular receipt)
	 * - Extract expense information using LLM services
	 * - Create expense records in the database
	 *
	 * @param input - Contains either text content or attachment IDs for processing
	 * @returns Event ID and confirmation message
	 */
	@Span('ReceiptResolver.extractReceipt')
	@Authorized()
	@Mutation(() => ExtractReceiptResult)
	async extractReceipt(
		@Arg('attachmentIds', () => [String], { nullable: true })
		attachmentIds: string[] = [],
		@Arg('text', () => String, { nullable: true })
		text: string = '',
	): Promise<ExtractReceiptResult> {
		this.logger.info('Processing receipt extraction request', {
			hasText: !!text,
			hasAttachmentIds: !!attachmentIds?.length,
			attachmentCount: attachmentIds?.length || 0,
		});

		// Validate input - must have either text or attachments
		if (!text && (!attachmentIds || attachmentIds.length === 0)) {
			throw new Error('Either text or attachmentIds must be provided');
		}

		// Validate all attachment IDs exist
		if (attachmentIds && attachmentIds.length > 0) {
			for (const attachmentId of attachmentIds) {
				const attachment =
					await this.attachmentRepository.getById(attachmentId);
				if (!attachment) {
					throw new Error(`Attachment not found: ${attachmentId}`);
				}
			}
		}

		const eventIds: string[] = [];

		for (const attachmentId of attachmentIds || []) {
			// Create receipt event payload
			const receiptEvent = {
				id: randomUUID(),
				attachmentIds: [attachmentId],
				emailText: text,
			};

			eventIds.push(receiptEvent.id);

			// Publish receipt event to event bus
			await this.eventBus.send('receipt', receiptEvent);

			// delay for .3 seconds to avoid rate limiting
			await new Promise((resolve) => setTimeout(resolve, 300));
		}

		this.logger.info('Receipt event published successfully', {
			eventIds,
		});

		return {
			eventIds,
			message:
				'Receipt processing started successfully. The extraction will be processed asynchronously.',
		};
	}
}

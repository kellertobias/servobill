import { Entity } from 'electrodb';

import { DYNAMODB_REPOSITORY_TEST_SET } from '../di-tokens';
import { AbstractDynamodbRepository } from '../abstract-dynamodb-repository';

import {
	entitySchema,
	AttachmentOrmEntity,
	AttachmentSchema,
	attachmentExpenseLinkSchema,
} from './dynamodb-orm-entity';
import { AttachmentCreateInput } from './interface';
import { ATTACHMENT_REPO_NAME, ATTACHMENT_REPOSITORY } from './di-tokens';

import { AttachmentEntity } from '@/backend/entities/attachment.entity';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';
import type { DynamoDBService } from '@/backend/services/dynamodb.service';
import { shouldRegister } from '@/backend/services/should-register';
import { DatabaseType } from '@/backend/services/constants';
import {
	DYNAMODB_SERVICE,
	EVENTBUS_SERVICE,
} from '@/backend/services/di-tokens';
import type { EventBusService } from '@/backend/services/eventbus.service';

/**
 * DynamoDB repository for managing AttachmentEntity records.
 */
@Service({
	name: ATTACHMENT_REPOSITORY,
	...shouldRegister(DatabaseType.DYNAMODB),
	addToTestSet: [DYNAMODB_REPOSITORY_TEST_SET],
})
export class AttachmentDynamoDBRepository extends AbstractDynamodbRepository<
	AttachmentOrmEntity,
	AttachmentEntity,
	[AttachmentCreateInput],
	AttachmentSchema
> {
	protected logger = new Logger(ATTACHMENT_REPO_NAME);
	protected mainIdName = 'attachmentId';
	protected storeId = 'attachment';
	protected linkStore: Entity<
		string,
		string,
		string,
		typeof attachmentExpenseLinkSchema.schema
	>;
	protected linkStoreId = 'attachmentExpenseLink';

	constructor(
		@Inject(DYNAMODB_SERVICE) private dynamoDb: DynamoDBService,
		@Inject(EVENTBUS_SERVICE) protected eventBus: EventBusService,
	) {
		super();
		this.store = this.dynamoDb.getEntity(entitySchema.schema);
		this.linkStore = this.dynamoDb.getEntity(
			attachmentExpenseLinkSchema.schema,
		);
	}

	public async save(entity: AttachmentEntity): Promise<void> {
		await super.save(entity);
		await this.populateExpenseLinks(entity);
	}

	public async delete(id: string): Promise<void> {
		const entity = await this.getById(id);
		if (!entity) {
			throw new Error(`Attachment with id ${id} not found`);
		}
		await this.populateExpenseLinks(entity, true);
		await super.delete(id);
	}

	public async createWithId(
		id: string,
		input: AttachmentCreateInput,
	): Promise<AttachmentEntity> {
		const entity = await super.createWithId(id, input);
		await this.populateExpenseLinks(entity);
		return entity;
	}

	public async create(input: AttachmentCreateInput): Promise<AttachmentEntity> {
		const entity = await super.create(input);
		await this.populateExpenseLinks(entity);
		return entity;
	}

	/**
	 * Converts a DynamoDB record to a domain AttachmentEntity.
	 */
	public ormToDomainEntitySafe(
		orm: Omit<AttachmentOrmEntity, 'storeId'>,
	): AttachmentEntity {
		return new AttachmentEntity({
			id: orm.attachmentId,
			createdAt: new Date(orm.createdAt),
			updatedAt: new Date(orm.updatedAt),
			fileName: orm.fileName,
			mimeType: orm.mimeType,
			size: orm.size,
			s3Key: orm.s3Key,
			s3Bucket: orm.s3Bucket,
			status: orm.status as 'pending' | 'finished',
			invoiceId: orm.linkType === 'invoice' ? orm.linkedId : undefined,
			inventoryId: orm.linkType === 'inventory' ? orm.linkedId : undefined,
			expenseIds: orm.linkType === 'expense' ? JSON.parse(orm.linkedId) : [],
		});
	}

	/**
	 * Converts a domain AttachmentEntity to a DynamoDB record.
	 * Sets 'linkedId' to the first available link or 'orphaned'.
	 */
	public domainToOrmEntity(
		domain: AttachmentEntity,
	): Omit<AttachmentOrmEntity, 'storeId'> {
		return {
			attachmentId: domain.id,
			createdAt: domain.createdAt.toISOString(),
			updatedAt: domain.updatedAt.toISOString(),
			fileName: domain.fileName,
			mimeType: domain.mimeType,
			size: domain.size,
			s3Key: domain.s3Key,
			s3Bucket: domain.s3Bucket,
			status: domain.status,
			linkType: (() => {
				if (domain.invoiceId) {
					return 'invoice';
				}
				if (domain.inventoryId) {
					return 'inventory';
				}
				if (domain.expenseIds) {
					return 'expense';
				}
				return 'orphaned';
			})(),
			linkedId: (() => {
				if (domain.invoiceId) {
					return domain.invoiceId;
				}
				if (domain.inventoryId) {
					return domain.inventoryId;
				}
				if (domain.expenseIds) {
					return JSON.stringify(domain.expenseIds);
				}
				return 'orphaned';
			})(),
		};
	}

	/**
	 * Generates an empty AttachmentEntity with the given parameters.
	 */
	public generateEmptyItem(
		id: string,
		input: AttachmentCreateInput,
	): AttachmentEntity {
		return new AttachmentEntity({
			id,
			fileName: input.fileName,
			mimeType: input.mimeType,
			size: input.size,
			s3Key: input.s3Key,
			s3Bucket: input.s3Bucket,
			status: 'pending',
			createdAt: new Date(),
			updatedAt: new Date(),
			expenseIds: input.expenseIds || [],
		});
	}

	/**
	 * List attachments by query, filtering by linked entity IDs.
	 * Uses the single 'linkedId' GSI for all queries.
	 */
	public async listByQuery(query: {
		invoiceId?: string;
		expenseId?: string;
		inventoryId?: string;
		skip?: number;
		limit?: number;
		cursor?: string;
	}): Promise<AttachmentEntity[]> {
		let data: AttachmentOrmEntity[] = [];

		if (query.expenseId) {
			const linkResults = await this.linkStore.query
				.byExpenseId({
					expenseId: query.expenseId,
				})
				.go();
			const attachmentIds = linkResults.data.map((l) => l.attachmentId);
			if (attachmentIds.length === 0) {
				return [];
			}
			const attachmentsResult = await this.store
				.get(
					attachmentIds.map((id) => ({
						attachmentId: id,
						storeId: this.storeId,
					})),
				)
				.go();
			data = attachmentsResult.data;
		} else {
			let linkedId: string | undefined;
			if (query.invoiceId) {
				linkedId = query.invoiceId;
			} else if (query.inventoryId) {
				linkedId = query.inventoryId;
			}

			if (linkedId) {
				const result = await this.store.query
					.byLinkedId({
						storeId: this.storeId,
						linkedId,
					})
					.go();
				data = result.data;
			} else {
				// List all (not recommended for large tables), for now only orphaned
				const result = await this.store.query
					.byLinkedId({
						storeId: this.storeId,
						linkedId: 'orphaned',
					})
					.go();
				data = result.data;
			}
		}

		const attachments = data.map((orm) => this.ormToDomainEntitySafe(orm));
		return attachments;
	}

	/**
	 * Delete all orphaned attachments (not linked to any entity).
	 * Returns the number of deleted attachments.
	 * Uses the single 'linkedId' GSI with 'orphaned'.
	 */
	public async deleteOrphaned(): Promise<number> {
		const result = await this.store.query
			.byLinkedId({
				storeId: this.storeId,
				linkedId: 'orphaned',
			})
			.go();
		const orphanedInMainTable = result.data;

		const orphanedAttachments = [];
		for (const a of orphanedInMainTable) {
			const links = await this.linkStore.query
				.byAttachmentId({ attachmentId: a.attachmentId })
				.go();
			if (links.data.length === 0) {
				orphanedAttachments.push(a);
			}
		}

		for (const a of orphanedAttachments) {
			await this.delete(a.attachmentId);
		}
		return orphanedAttachments.length;
	}

	private async populateExpenseLinks(
		entity: AttachmentEntity,
		deleteAllLinks = false,
	): Promise<void> {
		const existingLinks = await this.linkStore.query
			.byAttachmentId({ attachmentId: entity.id })
			.go();

		const newLinks = deleteAllLinks
			? []
			: entity.expenseIds?.filter(
					(id) => !existingLinks.data.some((link) => link.expenseId === id),
				);
		const linksToDelete = deleteAllLinks
			? existingLinks.data
			: existingLinks.data.filter(
					(link) => !entity.expenseIds?.includes(link.expenseId),
				);

		if (newLinks && newLinks.length > 0) {
			for (const link of newLinks) {
				await this.linkStore
					.put({
						attachmentId: entity.id,
						expenseId: link,
						storeId: this.linkStoreId,
					})
					.go();
			}
		}

		if (linksToDelete && linksToDelete.length > 0) {
			await this.linkStore
				.delete(
					linksToDelete.map((link) => ({
						attachmentId: link.attachmentId,
						expenseId: link.expenseId,
						storeId: this.linkStoreId,
					})),
				)
				.go();
		}
	}
}

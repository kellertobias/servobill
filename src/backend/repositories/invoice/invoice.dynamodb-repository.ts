import { shouldRegister } from '../../services/should-register';
import { DYNAMODB_REPOSITORY_TEST_SET } from '../di-tokens';

import { INVOICE_REPO_NAME, INVOICE_REPOSITORY } from './di-tokens';
import { entitySchema, InvoiceOrmEntity } from './dynamodb-orm-entity';

import type { InvoiceRepository } from './index';

import { AbstractDynamodbRepository } from '@/backend/repositories/abstract-dynamodb-repository';
import type { DynamoDBService } from '@/backend/services/dynamodb.service';
import {
	InvoiceEntity,
	InvoiceStatus,
	InvoiceType,
} from '@/backend/entities/invoice.entity';
import { InvoiceItemEntity } from '@/backend/entities/invoice-item.entity';
import {
	InvoiceActivityEntity,
	InvoiceActivityType,
} from '@/backend/entities/invoice-activity.entity';
import { InvoiceSubmissionEntity } from '@/backend/entities/invoice-submission.entity';
import { CustomerEntity } from '@/backend/entities/customer.entity';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';
import { CustomJson } from '@/common/json';
import { DatabaseType } from '@/backend/services/constants';
import {
	DYNAMODB_SERVICE,
	EVENTBUS_SERVICE,
} from '@/backend/services/di-tokens';
import type { EventBusService } from '@/backend/services/eventbus.service';

/**
 * DynamoDB implementation of the InvoiceRepository interface.
 */
@Service({
	name: INVOICE_REPOSITORY,
	...shouldRegister(DatabaseType.DYNAMODB),
	addToTestSet: [DYNAMODB_REPOSITORY_TEST_SET],
})
export class InvoiceDynamodbRepository
	extends AbstractDynamodbRepository<
		InvoiceOrmEntity,
		InvoiceEntity,
		[InvoiceType, CustomerEntity, string],
		typeof entitySchema.schema
	>
	implements InvoiceRepository
{
	protected logger = new Logger(INVOICE_REPO_NAME);
	protected mainIdName: string = 'invoiceId';
	protected storeId: string = 'invoice';

	constructor(
		@Inject(DYNAMODB_SERVICE) private dynamoDb: DynamoDBService,
		@Inject(EVENTBUS_SERVICE) protected eventBus: EventBusService,
	) {
		super();
		this.eventBus = eventBus;
		this.store = this.dynamoDb.getEntity(entitySchema.schema);
	}

	/**
	 * Converts a DynamoDB entity to a domain InvoiceEntity.
	 */
	public ormToDomainEntitySafe(
		entity: Omit<InvoiceOrmEntity, 'storeId'>,
	): InvoiceEntity {
		return new InvoiceEntity({
			id: entity.invoiceId,
			subject: entity.subject,
			offerNumber: entity.offerNumber,
			invoiceNumber: entity.invoiceNumber,
			type: InvoiceType[entity.type as keyof typeof InvoiceType],
			status: InvoiceStatus[entity.status as keyof typeof InvoiceStatus],
			createdAt: entity.createdAt ? new Date(entity.createdAt) : undefined,
			updatedAt: entity.updatedAt ? new Date(entity.updatedAt) : undefined,
			offeredAt: entity.offeredAt ? new Date(entity.offeredAt) : undefined,
			invoicedAt: entity.invoicedAt ? new Date(entity.invoicedAt) : undefined,
			dueAt: entity.dueAt ? new Date(entity.dueAt) : undefined,
			paidCents: entity.paidCents,
			paidAt: entity.paidAt ? new Date(entity.paidAt) : undefined,
			paidVia: entity.paidVia,
			footerText: entity.footerText,
			totalCents: entity.totalCents,
			totalTax: entity.totalTax,
			items: entity.items
				? CustomJson.fromJson<InvoiceItemEntity[]>(entity.items).map(
						(item) => new InvoiceItemEntity(item),
					)
				: [],
			activity: entity.activity
				? CustomJson.fromJson<InvoiceActivityEntity[]>(entity.activity).map(
						(activity) => new InvoiceActivityEntity(activity),
					)
				: [],
			submissions: entity.submissions
				? CustomJson.fromJson<InvoiceSubmissionEntity[]>(
						entity.submissions,
					).map((submission) => new InvoiceSubmissionEntity(submission))
				: [],
			customer: new CustomerEntity({
				...CustomJson.fromJson<CustomerEntity>(entity.customer),
				id: entity.customerId,
			}),
			links: CustomJson.fromJson(entity.links),
			contentHash: entity.contentHash,
			pdf: entity.pdf ? CustomJson.fromJson(entity.pdf) : undefined,
			processedEventIds: entity.processedEventIds
				? CustomJson.fromJson(entity.processedEventIds)
				: undefined,
		});
	}

	/**
	 * Converts a domain InvoiceEntity to a DynamoDB entity.
	 */
	public domainToOrmEntity(
		domainEntity: InvoiceEntity,
	): Omit<InvoiceOrmEntity, 'storeId'> {
		const { id: customerId, ...customer } = domainEntity.customer;
		return {
			invoiceId: domainEntity.id,
			createdAt: domainEntity.createdAt.toISOString(),
			updatedAt: domainEntity.updatedAt.toISOString(),
			invoicedAt: domainEntity.invoicedAt
				? domainEntity.invoicedAt.toISOString()
				: '',
			offeredAt: domainEntity.offeredAt
				? domainEntity.offeredAt.toISOString()
				: '',
			dueAt: domainEntity.dueAt ? domainEntity.dueAt.toISOString() : '',
			paidAt: domainEntity.paidAt ? domainEntity.paidAt.toISOString() : '',
			totalCents: Math.round(domainEntity.totalCents),
			totalTax: Math.round(domainEntity.totalTax),
			paidCents: domainEntity.paidCents,
			offerNumber: domainEntity.offerNumber,
			invoiceNumber: domainEntity.invoiceNumber,
			customerId,
			customer: CustomJson.toJson(customer),
			type: domainEntity.type,
			status: domainEntity.status,
			paidVia: domainEntity.paidVia,
			footerText: domainEntity.footerText,
			subject: domainEntity.subject,
			submissions: CustomJson.toJson(domainEntity.submissions) || '[]',
			items: CustomJson.toJson(domainEntity.items) || '[]',
			activity: CustomJson.toJson(domainEntity.activity) || '[]',
			links: CustomJson.toJson(domainEntity.links) || '{}',
			contentHash: domainEntity.contentHash,
			pdf: CustomJson.toJson(domainEntity.pdf) || '',
			processedEventIds:
				CustomJson.toJson(domainEntity.processedEventIds) || '[]',
		};
	}

	/**
	 * Generates an empty InvoiceEntity with the given id, type, customer, and user.
	 */
	protected generateEmptyItem(
		id: string,
		type: InvoiceType,
		customer: CustomerEntity,
		user: string,
	): InvoiceEntity {
		return new InvoiceEntity({
			id,
			type,
			customer,
			createdAt: new Date(),
			updatedAt: new Date(),
			status: InvoiceStatus.DRAFT,
			items: [],
			activity: [
				new InvoiceActivityEntity({
					type:
						type === InvoiceType.INVOICE
							? InvoiceActivityType.CREATED_INVOICE
							: InvoiceActivityType.CREATED_OFFER,
					user,
				}),
			],
			submissions: [],
			totalCents: 0,
			totalTax: 0,
		});
	}

	/**
	 * Lists invoices by query (type, status, year, skip, limit).
	 * Applies in-memory filtering for DynamoDB due to index limitations.
	 * @param query Query object with optional type, status, year, skip, limit, cursor
	 * @returns Array of InvoiceEntity
	 */
	public async listByQuery(query: {
		where?: { type?: InvoiceType; status?: InvoiceStatus; year?: number };
		skip?: number;
		limit?: number;
		cursor?: string;
	}): Promise<InvoiceEntity[]> {
		const data = await this.store.query
			.byYear({ storeId: this.storeId })
			.gt({
				createdAt: new Date(
					`${query.where?.year || new Date().getFullYear() - 20}-01-01`,
				).toISOString(),
			})
			.go();

		let results = data.data.map((elm: InvoiceOrmEntity) =>
			this.ormToDomainEntity(elm),
		);

		// sort all data by createdAt, so that the latest invoices are at the top
		results = results.sort((a, b) => {
			return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
		});

		// In-memory filtering for type and status
		if (query.where?.type) {
			results = results.filter(
				(inv: InvoiceEntity) => inv.type === query.where?.type,
			);
		}
		if (query.where?.status) {
			results = results.filter(
				(inv: InvoiceEntity) => inv.status === query.where?.status,
			);
		}

		// Optionally, add skip/limit if needed
		if (query.skip && query.skip > 0) {
			results = results.slice(query.skip);
		}
		if (query.limit && query.limit > 0) {
			results = results.slice(0, query.limit);
		}

		return results;
	}
}

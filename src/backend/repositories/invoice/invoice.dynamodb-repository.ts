import {
	IndexCompositeAttributes,
	QueryBranches,
	QueryOperations,
	ResponseItem,
} from 'electrodb';

import { AbstractDynamodbRepository } from '@/backend/repositories/abstract-dynamodb-repository';
import { DBService } from '@/backend/services/dynamodb.service';
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
import { INVOICE_REPO_NAME, INVOICE_REPOSITORY } from './di-tokens';
import { DatabaseType } from '@/backend/services/config.service';
import { shouldRegister } from '../../services/should-register';
import { CustomJson } from '@/common/json';
import type { InvoiceRepository } from './index';

const entitySchema = DBService.getSchema({
	model: {
		entity: 'invoice',
		version: '1',
		service: 'invoice',
	},
	attributes: {
		storeId: { type: 'string', required: true },
		invoiceId: { type: 'string', required: true },
		invoicedAt: { type: 'string' },
		offeredAt: { type: 'string' },
		dueAt: { type: 'string' },
		paidAt: { type: 'string' },
		totalCents: { type: 'number' },
		totalTax: { type: 'number' },
		paidCents: { type: 'number' },
		offerNumber: { type: 'string' },
		invoiceNumber: { type: 'string' },
		customerId: { type: 'string', required: true },
		customer: { type: 'string', required: true },
		createdAt: { type: 'string', required: true },
		updatedAt: { type: 'string', required: true },
		type: { type: 'string', required: true },
		status: { type: 'string' },
		paidVia: { type: 'string' },
		footerText: { type: 'string' },
		subject: { type: 'string' },
		submissions: { type: 'string' },
		items: { type: 'string' },
		activity: { type: 'string' },
		links: { type: 'string' },
		pdf: { type: 'string' },
		contentHash: { type: 'string' },
	},
	indexes: {
		byId: {
			pk: { field: 'pk', composite: ['invoiceId'] },
			sk: { field: 'sk', composite: ['storeId'] },
		},
		byYear: {
			index: 'gsi1pk-gsi1sk-index',
			pk: { field: 'gsi1pk', composite: ['storeId'] },
			sk: { field: 'gsi1sk', composite: ['createdAt'] },
		},
	},
});

type InvoiceSchema = typeof entitySchema.schema;
type InvoiceSchemaResponseItem = ResponseItem<
	string,
	string,
	string,
	InvoiceSchema
>;
export type InvoiceOrmEntity = typeof entitySchema.responseItem;

/**
 * DynamoDB implementation of the InvoiceRepository interface.
 */
@Service({ name: INVOICE_REPOSITORY, ...shouldRegister(DatabaseType.DYNAMODB) })
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
	protected store: any;

	constructor(@Inject(DBService) private dynamoDb: DBService) {
		super();
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
			totalCents: domainEntity.totalCents,
			totalTax: domainEntity.totalTax,
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
	 * @param query Query object with optional type, status, year, skip, limit, cursor
	 * @returns Array of InvoiceEntity
	 */
	public async listByQuery(query: {
		where?: { type?: InvoiceType; status?: InvoiceStatus; year?: number };
		skip?: number;
		limit?: number;
		cursor?: string;
	}): Promise<InvoiceEntity[]> {
		const year = query.where?.year || new Date().getFullYear() - 10;
		const data = await this.store.query
			.byYear({ storeId: this.storeId })
			.gt({ createdAt: new Date(`${year}-01-01`).toISOString() })
			.go();
		return data.data.map((elm: InvoiceOrmEntity) =>
			this.ormToDomainEntity(elm),
		);
	}
}

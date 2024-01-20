import { DBService } from '../services/dynamodb.service';
import {
	InvoiceEntity,
	InvoiceStatus,
	InvoiceType,
} from '../entities/invoice.entity';
import { InvoiceItemEntity } from '../entities/invoice-item.entity';
import {
	InvoiceActivityEntity,
	InvoiceActivityType,
} from '../entities/invoice-activity.entity';
import { InvoiceSubmissionEntity } from '../entities/invoice-submission.entity';
import { CustomerEntity } from '../entities/customer.entity';
import { Logger } from '../services/logger.service';
import { Span } from '../instrumentation';

import { AbstractRepository } from './abstract-repository';

import { Inject, Service } from '@/common/di';
import { CustomJson } from '@/common/json';

const entitySchema = DBService.getSchema({
	model: {
		entity: 'invoice',
		version: '1',
		service: 'invoice',
	},
	attributes: {
		storeId: {
			type: 'string',
			required: true,
		},
		invoiceId: {
			type: 'string',
			required: true,
		},
		invoicedAt: {
			type: 'string',
		},
		offeredAt: {
			type: 'string',
		},
		dueAt: {
			type: 'string',
		},
		paidAt: {
			type: 'string',
		},
		totalCents: {
			type: 'number',
		},
		totalTax: {
			type: 'number',
		},
		paidCents: {
			type: 'number',
		},
		offerNumber: {
			type: 'string',
		},
		invoiceNumber: {
			type: 'string',
		},
		customerId: {
			type: 'string',
			required: true,
		},
		customer: {
			type: 'string',
			required: true,
		},
		createdAt: {
			type: 'string',
			required: true,
		},
		updatedAt: {
			type: 'string',
			required: true,
		},
		type: {
			type: 'string',
			required: true,
		},
		status: {
			type: 'string',
		},
		paidVia: {
			type: 'string',
		},
		footerText: {
			type: 'string',
		},
		subject: {
			type: 'string',
		},
		submissions: {
			type: 'string',
		},
		items: {
			type: 'string',
		},
		activity: {
			type: 'string',
		},
		links: {
			type: 'string',
		},
		pdf: {
			type: 'string',
		},
		contentHash: {
			type: 'string',
		},
	},
	indexes: {
		byId: {
			pk: {
				field: 'pk',
				composite: ['invoiceId'],
			},
			sk: {
				field: 'sk',
				composite: ['storeId'],
			},
		},
		byYear: {
			index: 'gsi1pk-gsi1sk-index',
			pk: {
				field: 'gsi1pk',
				composite: ['storeId'],
			},
			sk: {
				field: 'gsi1sk',
				composite: ['createdAt'],
			},
		},
	},
});

export type InvoiceOrmEntity = typeof entitySchema.responseItem;

@Service()
export class InvoiceRepository extends AbstractRepository<
	InvoiceOrmEntity,
	InvoiceEntity,
	[InvoiceType, CustomerEntity, string],
	typeof entitySchema.schema
> {
	protected logger = new Logger(InvoiceRepository.name);
	protected mainIdName: string = 'invoiceId';

	protected storeId: string = 'invoice';

	constructor(@Inject(DBService) private dynamoDb: DBService) {
		super();
		this.store = this.dynamoDb.getEntity(entitySchema.schema);
	}

	protected ormToDomainEntitySafe(
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

	@Span('InvoiceRepository.listByQuery')
	public async listByQuery(query: {
		where?: { type?: InvoiceType; status?: InvoiceStatus; year?: number };
		skip?: number;
		limit?: number;
		cursor?: string;
	}): Promise<InvoiceEntity[]> {
		const year = query.where?.year || new Date().getFullYear() - 10;
		const data = await this.store.query
			.byYear({
				storeId: this.storeId,
			})
			.gt({ createdAt: new Date(`${year}-01-01`).toISOString() })
			.go();
		return data.data.map((elm) => this.ormToDomainEntity(elm));
	}

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
}

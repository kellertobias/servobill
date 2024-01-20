import {
	IndexCompositeAttributes,
	QueryBranches,
	QueryOperations,
	ResponseItem,
} from 'electrodb';

import { DBService } from '../services/dynamodb.service';
import { CustomerEntity } from '../entities/customer.entity';
import { Logger } from '../services/logger.service';
import { Span } from '../instrumentation';

import { AbstractRepository } from './abstract-repository';

import { Inject, Service } from '@/common/di';

const entitySchema = DBService.getSchema({
	model: {
		entity: 'customer',
		version: '1',
		service: 'customer',
	},
	attributes: {
		storeId: {
			type: 'string',
			required: true,
		},
		customerId: {
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
		customerNumber: {
			type: 'string',
			required: true,
		},
		name: {
			type: 'string',
			required: true,
		},
		searchName: {
			type: 'string',
			required: true,
		},
		contactName: {
			type: 'string',
		},
		showContact: {
			type: 'boolean',
			required: true,
		},
		email: {
			type: 'string',
		},
		street: {
			type: 'string',
		},
		zip: {
			type: 'string',
		},
		city: {
			type: 'string',
		},
		state: {
			type: 'string',
		},
		country: {
			type: 'string',
		},
		notes: {
			type: 'string',
		},
	},
	indexes: {
		byId: {
			pk: {
				field: 'pk',
				composite: ['customerId'],
			},
			sk: {
				field: 'sk',
				composite: ['storeId'],
			},
		},
		byName: {
			index: 'gsi1pk-gsi1sk-index',
			pk: {
				field: 'gsi1pk',
				composite: ['storeId'],
			},
			sk: {
				field: 'gsi1sk',
				composite: ['searchName'],
			},
		},
	},
});

type CustomerSchema = typeof entitySchema.schema;
type CustomerSchemaResponseItem = ResponseItem<
	string,
	string,
	string,
	CustomerSchema
>;
export type CustomerOrmEntity = typeof entitySchema.responseItem;

@Service()
export class CustomerRepository extends AbstractRepository<
	CustomerOrmEntity,
	CustomerEntity,
	[],
	typeof entitySchema.schema
> {
	protected logger = new Logger(CustomerRepository.name);
	protected mainIdName: string = 'customerId';

	protected storeId: string = 'customer';

	constructor(@Inject(DBService) private dynamoDb: DBService) {
		super();
		this.store = this.dynamoDb.getEntity(entitySchema.schema);
	}

	protected ormToDomainEntitySafe(
		entity: Omit<CustomerOrmEntity, 'storeId'>,
	): CustomerEntity {
		return new CustomerEntity({
			id: entity.customerId,
			createdAt: new Date(entity.createdAt),
			updatedAt: new Date(entity.updatedAt),
			customerNumber: entity.customerNumber,
			name: entity.name,
			contactName: entity.contactName,
			showContact: entity.showContact,
			email: entity.email,
			street: entity.street,
			zip: entity.zip,
			city: entity.city,
			state: entity.state,
			country: entity.country,
			notes: entity.notes,
		});
	}

	public domainToOrmEntity(
		domainEntity: CustomerEntity,
	): Omit<CustomerOrmEntity, 'storeId'> {
		const { id: customerId, ...customer } = domainEntity;
		return {
			customerId,
			showContact: customer.showContact || false,
			customerNumber: customer.customerNumber || '',
			name: customer.name || '',
			contactName: customer.contactName || '',
			email: customer.email || '',
			street: customer.street || '',
			zip: customer.zip || '',
			city: customer.city || '',
			state: customer.state || '',
			country: customer.country || '',
			notes: customer.notes || '',
			searchName: customer.name.toLowerCase(),
			createdAt: domainEntity.createdAt.toISOString(),
			updatedAt: domainEntity.updatedAt.toISOString(),
		};
	}

	protected generateEmptyItem(id: string): CustomerEntity {
		return new CustomerEntity({
			id,
			customerNumber: '',
			name: '',
			showContact: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}

	@Span('CustomerRepository.listByQuery')
	public async listByQuery(query: {
		where?: { search?: string };
		skip?: number;
		limit?: number;
		cursor?: string;
	}): Promise<CustomerEntity[]> {
		const queryBuilder = this.store.query.byName({ storeId: this.storeId });

		let queryExecutor:
			| QueryBranches<
					string,
					string,
					string,
					CustomerSchema,
					CustomerSchemaResponseItem,
					IndexCompositeAttributes<
						string,
						string,
						string,
						CustomerSchema,
						'byName'
					>
			  >
			| QueryOperations<
					string,
					string,
					string,
					CustomerSchema,
					unknown,
					CustomerSchemaResponseItem,
					IndexCompositeAttributes<
						string,
						string,
						string,
						CustomerSchema,
						'byName'
					>
			  > = queryBuilder;
		if (query.where?.search) {
			queryExecutor = queryBuilder.begins({ searchName: query.where.search });
		}
		const data = await queryExecutor.go();

		return data.data.map((elm) => this.ormToDomainEntity(elm));
	}
}

import {
	IndexCompositeAttributes,
	QueryBranches,
	QueryOperations,
	ResponseItem,
} from 'electrodb';

import { AbstractDynamodbRepository } from '@/backend/repositories/abstract-dynamodb-repository';
import { DynamoDBService } from '@/backend/services/dynamodb.service';
import { CustomerEntity } from '@/backend/entities/customer.entity';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';
import { CUSTOMER_REPO_NAME, CUSTOMER_REPOSITORY } from './di-tokens';
import { DatabaseType } from '@/backend/services/config.service';
import { shouldRegister } from '../../services/should-register';
import type { CustomerRepository } from './index';

const entitySchema = DynamoDBService.getSchema({
	model: {
		entity: 'customer',
		version: '1',
		service: 'customer',
	},
	attributes: {
		storeId: { type: 'string', required: true },
		customerId: { type: 'string', required: true },
		createdAt: { type: 'string', required: true },
		updatedAt: { type: 'string', required: true },
		customerNumber: { type: 'string', required: true },
		name: { type: 'string', required: true },
		searchName: { type: 'string', required: true },
		contactName: { type: 'string' },
		showContact: { type: 'boolean', required: true },
		email: { type: 'string' },
		street: { type: 'string' },
		zip: { type: 'string' },
		city: { type: 'string' },
		state: { type: 'string' },
		country: { type: 'string' },
		notes: { type: 'string' },
	},
	indexes: {
		byId: {
			pk: { field: 'pk', composite: ['customerId'] },
			sk: { field: 'sk', composite: ['storeId'] },
		},
		byName: {
			index: 'gsi1pk-gsi1sk-index',
			pk: { field: 'gsi1pk', composite: ['storeId'] },
			sk: { field: 'gsi1sk', composite: ['searchName'] },
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

/**
 * DynamoDB implementation of the CustomerRepository interface.
 */
@Service({
	name: CUSTOMER_REPOSITORY,
	...shouldRegister(DatabaseType.DYNAMODB),
})
export class CustomerDynamodbRepository
	extends AbstractDynamodbRepository<
		CustomerOrmEntity,
		CustomerEntity,
		[],
		typeof entitySchema.schema
	>
	implements CustomerRepository
{
	protected logger = new Logger(CUSTOMER_REPO_NAME);
	protected mainIdName: string = 'customerId';
	protected storeId: string = 'customer';
	protected store: any;

	constructor(@Inject(DynamoDBService) private dynamoDb: DynamoDBService) {
		super();
		this.store = this.dynamoDb.getEntity(entitySchema.schema);
	}

	/**
	 * Converts a DynamoDB entity to a domain CustomerEntity.
	 */
	public ormToDomainEntitySafe(
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

	/**
	 * Converts a domain CustomerEntity to a DynamoDB entity.
	 */
	public domainToOrmEntity(
		domainEntity: CustomerEntity,
	): Omit<CustomerOrmEntity, 'storeId'> {
		return {
			customerId: domainEntity.id,
			showContact: domainEntity.showContact || false,
			customerNumber: domainEntity.customerNumber || '',
			name: domainEntity.name || '',
			contactName: domainEntity.contactName || '',
			email: domainEntity.email || '',
			street: domainEntity.street || '',
			zip: domainEntity.zip || '',
			city: domainEntity.city || '',
			state: domainEntity.state || '',
			country: domainEntity.country || '',
			notes: domainEntity.notes || '',
			searchName: domainEntity.name.toLowerCase(),
			createdAt: domainEntity.createdAt.toISOString(),
			updatedAt: domainEntity.updatedAt.toISOString(),
		};
	}

	/**
	 * Generates an empty CustomerEntity with the given id.
	 */
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

	/**
	 * Lists customers by query (search, skip, limit).
	 * @param query Query object with optional search, skip, limit, cursor
	 * @returns Array of CustomerEntity
	 */
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
		return data.data.map((elm: CustomerOrmEntity) =>
			this.ormToDomainEntity(elm),
		);
	}
}

import {
	IndexCompositeAttributes,
	QueryBranches,
	QueryOperations,
	ResponseItem,
} from 'electrodb';

import { DBService } from '../services/dynamodb.service';
import { ProductEntity } from '../entities/product.entity';
import { Logger } from '../services/logger.service';

import { AbstractRepository } from './abstract-repository';

import { Inject, Service } from '@/common/di';

const entitySchema = DBService.getSchema({
	model: {
		entity: 'product',
		version: '1',
		service: 'product',
	},
	attributes: {
		storeId: {
			type: 'string',
			required: true,
		},
		productId: {
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
		name: {
			type: 'string',
			required: true,
		},
		category: {
			type: 'string',
			required: true,
		},
		searchName: {
			type: 'string',
			required: true,
		},
		description: {
			type: 'string',
		},
		notes: {
			type: 'string',
		},
		unit: {
			type: 'string',
		},
		priceCents: {
			type: 'number',
			required: true,
		},
		taxPercentage: {
			type: 'number',
			required: true,
		},
		expenseCents: {
			type: 'number',
		},
		expenseMultiplicator: {
			type: 'number',
		},
	},
	indexes: {
		byId: {
			pk: {
				field: 'pk',
				composite: ['productId'],
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

type ProductSchema = typeof entitySchema.schema;
type ProductSchemaResponseItem = ResponseItem<
	string,
	string,
	string,
	ProductSchema
>;
export type ProductOrmEntity = typeof entitySchema.responseItem;

@Service()
export class ProductRepository extends AbstractRepository<
	ProductOrmEntity,
	ProductEntity,
	[],
	typeof entitySchema.schema
> {
	protected logger = new Logger(ProductRepository.name);
	protected mainIdName: string = 'productId';

	protected storeId: string = 'product';

	constructor(@Inject(DBService) private dynamoDb: DBService) {
		super();
		this.store = this.dynamoDb.getEntity(entitySchema.schema);
	}

	protected ormToDomainEntitySafe(
		entity: Omit<ProductOrmEntity, 'storeId'>,
	): ProductEntity {
		return new ProductEntity({
			id: entity.productId,
			createdAt: new Date(entity.createdAt),
			updatedAt: new Date(entity.updatedAt),
			name: entity.name,
			notes: entity.notes,
			description: entity.description,
			category: entity.category,
			unit: entity.unit,
			priceCents: entity.priceCents,
			taxPercentage: entity.taxPercentage,
			expenseCents: entity.expenseCents || 0,
			expenseMultiplicator: entity.expenseMultiplicator || 1,
		});
	}

	public domainToOrmEntity(
		domainEntity: ProductEntity,
	): Omit<ProductOrmEntity, 'storeId'> {
		return {
			productId: domainEntity.id,
			name: domainEntity.name || '',
			notes: domainEntity.notes,
			description: domainEntity.description,
			category: domainEntity.category || '',
			unit: domainEntity.unit,
			priceCents: domainEntity.priceCents || 0,
			taxPercentage: domainEntity.taxPercentage || 0,
			searchName: domainEntity.name.toLowerCase(),
			createdAt: domainEntity.createdAt.toISOString(),
			updatedAt: domainEntity.updatedAt.toISOString(),
			expenseCents: domainEntity.expenseCents || 0,
			expenseMultiplicator: domainEntity.expenseMultiplicator || 1,
		};
	}

	protected generateEmptyItem(id: string): ProductEntity {
		return new ProductEntity({
			id,
			name: '',
			category: 'default',
			priceCents: 0,
			taxPercentage: 0,
			createdAt: new Date(),
			updatedAt: new Date(),
			expenseCents: 0,
			expenseMultiplicator: 1,
		});
	}

	public async listByQuery(query: {
		where?: { search?: string };
		skip?: number;
		limit?: number;
		cursor?: string;
	}): Promise<ProductEntity[]> {
		const queryBuilder = this.store.query.byName({ storeId: this.storeId });

		let queryExecutor:
			| QueryBranches<
					string,
					string,
					string,
					ProductSchema,
					ProductSchemaResponseItem,
					IndexCompositeAttributes<
						string,
						string,
						string,
						ProductSchema,
						'byName'
					>
			  >
			| QueryOperations<
					string,
					string,
					string,
					ProductSchema,
					unknown,
					ProductSchemaResponseItem,
					IndexCompositeAttributes<
						string,
						string,
						string,
						ProductSchema,
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

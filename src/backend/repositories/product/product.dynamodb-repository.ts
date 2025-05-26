import {
	IndexCompositeAttributes,
	QueryBranches,
	QueryOperations,
	ResponseItem,
} from 'electrodb';

import { AbstractDynamodbRepository } from '@/backend/repositories/abstract-dynamodb-repository';
import { DynamoDBService } from '@/backend/services/dynamodb.service';
import { ProductEntity } from '@/backend/entities/product.entity';
import { Logger } from '@/backend/services/logger.service';

import { Inject, Service } from '@/common/di';
import { PRODUCT_REPO_NAME, PRODUCT_REPOSITORY } from './di-tokens';
import { DatabaseType } from '@/backend/services/constants';
import { shouldRegister } from '../../services/should-register';
import type { ProductRepository } from './interface';
import {
	entitySchema,
	ProductOrmEntity,
	ProductSchema,
	ProductSchemaResponseItem,
} from './dynamodb-orm-entity';

@Service({ name: PRODUCT_REPOSITORY, ...shouldRegister(DatabaseType.DYNAMODB) })
/**
 * DynamoDB implementation of the ProductRepository interface.
 */
export class ProductDynamodbRepository
	extends AbstractDynamodbRepository<
		ProductOrmEntity,
		ProductEntity,
		[],
		typeof entitySchema.schema
	>
	implements ProductRepository
{
	protected logger = new Logger(PRODUCT_REPO_NAME);
	protected mainIdName: string = 'productId';

	protected storeId: string = 'product';

	constructor(@Inject(DynamoDBService) private dynamoDb: DynamoDBService) {
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
			expenseCategoryId: entity.expenseCategoryId || '',
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
			expenseCategoryId: domainEntity.expenseCategoryId || '',
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
			expenseCategoryId: '',
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

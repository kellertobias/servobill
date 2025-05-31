import {
	IndexCompositeAttributes,
	QueryBranches,
	QueryOperations,
} from 'electrodb';

import { shouldRegister } from '../../services/should-register';

import { PRODUCT_REPO_NAME, PRODUCT_REPOSITORY } from './di-tokens';
import type { ProductRepository } from './interface';
import {
	entitySchema,
	ProductOrmEntity,
	ProductSchema,
	ProductSchemaResponseItem,
} from './dynamodb-orm-entity';

import { AbstractDynamodbRepository } from '@/backend/repositories/abstract-dynamodb-repository';
import { DynamoDBService } from '@/backend/services/dynamodb.service';
import { ProductEntity } from '@/backend/entities/product.entity';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';
import { DatabaseType } from '@/backend/services/constants';

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
		// Parse expenses from JSON string to array
		const expensesArr =
			typeof entity.expenses === 'string' && entity.expenses.length > 0
				? (JSON.parse(entity.expenses) as ProductEntity['expenses'])
				: [];
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
			expenses: (expensesArr || []).map((e) => ({
				name: e.name ?? '',
				price: e.price ?? 0,
				categoryId: e.categoryId,
			})),
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
			// Stringify expenses array for storage
			expenses:
				domainEntity.expenses && domainEntity.expenses.length > 0
					? JSON.stringify(domainEntity.expenses)
					: '',
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
			expenses: [],
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

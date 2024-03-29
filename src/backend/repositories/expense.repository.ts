import { DBService } from '../services/dynamodb.service';
import { ExpenseEntity } from '../entities/expense.entity';
import { Logger } from '../services/logger.service';
import { Span } from '../instrumentation';

import { AbstractRepository } from './abstract-repository';

import { Inject, Service } from '@/common/di';

const entitySchema = DBService.getSchema({
	model: {
		entity: 'expense',
		version: '1',
		service: 'expense',
	},
	attributes: {
		storeId: {
			type: 'string',
			required: true,
		},
		expenseId: {
			type: 'string',
			required: true,
		},
		expendedAt: {
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
		expendedCents: {
			type: 'number',
			required: true,
		},
		taxCents: {
			type: 'number',
		},
		name: {
			type: 'string',
			required: true,
		},
		description: {
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
				composite: ['expenseId'],
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
				composite: ['expendedAt'],
			},
		},
	},
});

export type ExpenseOrmEntity = typeof entitySchema.responseItem;

@Service()
export class ExpenseRepository extends AbstractRepository<
	ExpenseOrmEntity,
	ExpenseEntity,
	[],
	typeof entitySchema.schema
> {
	protected logger = new Logger(ExpenseRepository.name);
	protected mainIdName: string = 'expenseId';

	protected storeId: string = 'expense';

	constructor(@Inject(DBService) private dynamoDb: DBService) {
		super();
		this.store = this.dynamoDb.getEntity(entitySchema.schema);
	}

	protected ormToDomainEntitySafe(
		entity: Omit<ExpenseOrmEntity, 'storeId'>,
	): ExpenseEntity {
		return new ExpenseEntity({
			id: entity.expenseId,
			name: entity.name,
			description: entity.description,
			notes: entity.notes,
			createdAt: new Date(entity.createdAt),
			updatedAt: new Date(entity.updatedAt),
			expendedAt: new Date(entity.expendedAt),
			expendedCents: entity.expendedCents,
			taxCents: entity.taxCents,
		});
	}

	public domainToOrmEntity(
		domainEntity: ExpenseEntity,
	): Omit<ExpenseOrmEntity, 'storeId'> {
		return {
			expenseId: domainEntity.id,
			createdAt: domainEntity.createdAt.toISOString(),
			updatedAt: domainEntity.updatedAt.toISOString(),
			expendedAt: domainEntity.expendedAt?.toISOString(),
			expendedCents: domainEntity.expendedCents,
			taxCents: domainEntity.taxCents,
			name: domainEntity.name,
			description: domainEntity.description,
			notes: domainEntity.notes,
		};
	}

	@Span('ExpenseRepository.listByQuery')
	public async listByQuery(query: {
		where?: { search?: string; year?: number };
		skip?: number;
		limit?: number;
		cursor?: string;
	}): Promise<ExpenseEntity[]> {
		const year = query.where?.year || new Date().getFullYear() - 10;
		const data = await this.store.query
			.byYear({
				storeId: this.storeId,
			})
			.gt({ expendedAt: new Date(`${year}-01-01`).toISOString() })
			.go();
		return data.data.map((elm) => this.ormToDomainEntity(elm));
	}

	protected generateEmptyItem(id: string): ExpenseEntity {
		return new ExpenseEntity({
			id,
			name: '',
			description: '',
			notes: '',
			createdAt: new Date(),
			updatedAt: new Date(),
			expendedAt: new Date(),
			expendedCents: 0,
			taxCents: 0,
		});
	}
}

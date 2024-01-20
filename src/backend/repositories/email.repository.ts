import { DBService } from '../services/dynamodb.service';
import { Logger } from '../services/logger.service';

import { AbstractRepository } from './abstract-repository';

import { Inject, Service } from '@/common/di';
import { EmailEntity } from '@/backend/entities/product.entity copy';

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
		emailId: {
			type: 'string',
			required: true,
		},
		entityType: {
			type: 'string',
			required: true,
		},
		entityId: {
			type: 'string',
			required: true,
		},
		recipient: {
			type: 'string',
			required: true,
		},
		sentAt: {
			type: 'string',
			required: true,
		},
	},
	indexes: {
		byId: {
			pk: {
				field: 'pk',
				composite: ['emailId'],
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
				composite: ['sentAt'],
			},
		},
	},
});

export type EmailOrmEntity = typeof entitySchema.responseItem;

@Service()
export class EmailRepository extends AbstractRepository<
	EmailOrmEntity,
	EmailEntity,
	[],
	typeof entitySchema.schema
> {
	protected logger = new Logger(EmailRepository.name);
	protected mainIdName: string = 'productId';

	protected storeId: string = 'product';

	constructor(@Inject(DBService) private dynamoDb: DBService) {
		super();
		this.store = this.dynamoDb.getEntity(entitySchema.schema);
	}

	protected ormToDomainEntitySafe(
		entity: Omit<EmailOrmEntity, 'storeId'>,
	): EmailEntity {
		return new EmailEntity({
			id: entity.emailId,
			entityType: entity.entityType,
			entityId: entity.entityId,
			recipient: entity.recipient,
			sentAt: new Date(entity.sentAt),
		});
	}

	public domainToOrmEntity(
		domainEntity: EmailEntity,
	): Omit<EmailOrmEntity, 'storeId'> {
		return {
			emailId: domainEntity.id,
			entityType: domainEntity.entityType,
			entityId: domainEntity.entityId,
			recipient: domainEntity.recipient,
			sentAt: domainEntity.sentAt.toISOString(),
		};
	}

	protected generateEmptyItem(id: string): EmailEntity {
		return new EmailEntity({
			id,
			entityType: '',
			entityId: '',
			recipient: '',
			sentAt: new Date(),
		});
	}
}

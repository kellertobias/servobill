import {
	IndexCompositeAttributes,
	QueryBranches,
	QueryOperations,
	ResponseItem,
} from 'electrodb';

import { AbstractDynamodbRepository } from '@/backend/repositories/abstract-dynamodb-repository';
import { DBService } from '@/backend/services/dynamodb.service';
import { EmailEntity } from '@/backend/entities/email.entity';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';
import { EMAIL_REPO_NAME, EMAIL_REPOSITORY } from './di-tokens';
import { DatabaseType } from '@/backend/services/config.service';
import { shouldRegister } from '../../services/should-register';
import type { EmailRepository } from './index';

const entitySchema = DBService.getSchema({
	model: {
		entity: 'email',
		version: '1',
		service: 'email',
	},
	attributes: {
		storeId: { type: 'string', required: true },
		emailId: { type: 'string', required: true },
		entityType: { type: 'string', required: true },
		entityId: { type: 'string', required: true },
		recipient: { type: 'string', required: true },
		sentAt: { type: 'string', required: true },
	},
	indexes: {
		byId: {
			pk: { field: 'pk', composite: ['emailId'] },
			sk: { field: 'sk', composite: ['storeId'] },
		},
		byName: {
			index: 'gsi1pk-gsi1sk-index',
			pk: { field: 'gsi1pk', composite: ['storeId'] },
			sk: { field: 'gsi1sk', composite: ['sentAt'] },
		},
	},
});

type EmailSchema = typeof entitySchema.schema;
type EmailSchemaResponseItem = ResponseItem<
	string,
	string,
	string,
	EmailSchema
>;
export type EmailOrmEntity = typeof entitySchema.responseItem;

/**
 * DynamoDB implementation of the EmailRepository interface.
 */
@Service({ name: EMAIL_REPOSITORY, ...shouldRegister(DatabaseType.DYNAMODB) })
export class EmailDynamodbRepository
	extends AbstractDynamodbRepository<
		EmailOrmEntity,
		EmailEntity,
		[],
		typeof entitySchema.schema
	>
	implements EmailRepository
{
	protected logger = new Logger(EMAIL_REPO_NAME);
	protected mainIdName: string = 'emailId';
	protected storeId: string = 'email';
	protected store: any;

	constructor(@Inject(DBService) private dynamoDb: DBService) {
		super();
		this.store = this.dynamoDb.getEntity(entitySchema.schema);
	}

	/**
	 * Converts a DynamoDB entity to a domain EmailEntity.
	 */
	public ormToDomainEntitySafe(
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

	/**
	 * Converts a domain EmailEntity to a DynamoDB entity.
	 */
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

	/**
	 * Generates an empty EmailEntity with the given id.
	 */
	protected generateEmptyItem(id: string): EmailEntity {
		return new EmailEntity({
			id,
			entityType: '',
			entityId: '',
			recipient: '',
			sentAt: new Date(),
		});
	}

	/**
	 * Lists emails by query (search, skip, limit).
	 * @param query Query object with optional search, skip, limit, cursor
	 * @returns Array of EmailEntity
	 */
	public async listByQuery(query: {
		where?: { search?: string };
		skip?: number;
		limit?: number;
		cursor?: string;
	}): Promise<EmailEntity[]> {
		// For DynamoDB, we can only filter by recipient if needed
		// This is a placeholder for a more advanced search if required
		const data = await this.store.query.byName({ storeId: this.storeId }).go();
		return data.data.map((elm: EmailOrmEntity) => this.ormToDomainEntity(elm));
	}
}

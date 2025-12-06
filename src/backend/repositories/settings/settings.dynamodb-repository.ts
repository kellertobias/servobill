import {
	type AbstractSettingsEntity,
	SettingsEntity,
} from '@/backend/entities/settings.entity';
import { AbstractDynamodbRepository } from '@/backend/repositories/abstract-dynamodb-repository';
import { DatabaseType } from '@/backend/services/constants';
import {
	DYNAMODB_SERVICE,
	EVENTBUS_SERVICE,
} from '@/backend/services/di-tokens';
import type { DynamoDBService } from '@/backend/services/dynamodb.service';
import type { EventBusService } from '@/backend/services/eventbus.service';
import { Logger } from '@/backend/services/logger.service';
import { Inject, Service } from '@/common/di';
import { CustomJson } from '@/common/json';
import { shouldRegister } from '../../services/should-register';
import { DYNAMODB_REPOSITORY_TEST_SET } from '../di-tokens';
import { SETTINGS_REPO_NAME, SETTINGS_REPOSITORY } from './di-tokens';
import { entitySchema, type SettingsOrmEntity } from './dynamodb-orm-entity';
import type { SettingsRepository } from './interface';

const storeId = 'settings';

@Service({
	name: SETTINGS_REPOSITORY,
	...shouldRegister(DatabaseType.DYNAMODB),
	addToTestSet: [DYNAMODB_REPOSITORY_TEST_SET],
})
/**
 * DynamoDB implementation of the SettingsRepository interface.
 */
export class SettingsDynamodbRepository
	extends AbstractDynamodbRepository<
		SettingsOrmEntity,
		SettingsEntity,
		[],
		typeof entitySchema.schema
	>
	implements SettingsRepository
{
	protected logger = new Logger(SETTINGS_REPO_NAME);
	protected mainIdName: string = 'settingId';
	protected storeId: string = storeId;

	constructor(
		@Inject(DYNAMODB_SERVICE) private dynamoDb: DynamoDBService,
		@Inject(EVENTBUS_SERVICE) protected eventBus: EventBusService,
	) {
		super();
		this.store = this.dynamoDb.getEntity(entitySchema.schema);
	}

	/**
	 * Converts a DynamoDB ORM entity to a domain SettingsEntity.
	 */
	protected ormToDomainEntitySafe(
		entity: Omit<SettingsOrmEntity, 'storeId'>,
	): SettingsEntity {
		return new SettingsEntity({
			settingId: entity.settingId,
			data: entity.data,
		});
	}

	/**
	 * Converts a domain SettingsEntity to a DynamoDB ORM entity.
	 */
	public domainToOrmEntity(
		domainEntity: SettingsEntity,
	): Omit<SettingsOrmEntity, 'storeId'> {
		return {
			settingId: domainEntity.settingId,
			data: domainEntity.data,
		};
	}

	/**
	 * Generates an empty SettingsEntity with the given id.
	 */
	protected generateEmptyItem(id: string): SettingsEntity {
		return new SettingsEntity({
			settingId: id,
			data: '',
		});
	}

	/**
	 * Saves a settings record (upsert).
	 */
	public async save(setting: SettingsEntity): Promise<void> {
		await this.store
			.upsert({
				settingId: setting.settingId,
				storeId: this.storeId,
				data: setting.data,
			})
			.go();
	}

	/**
	 * Retrieves a settings record as a typed settings class instance (legacy/original API).
	 * @param SettingsClass The settings class constructor (must extend AbstractSettingsEntity)
	 * @returns An instance of the settings class, with data and save method.
	 */
	public async getSetting<T extends typeof AbstractSettingsEntity>(
		SettingsClass: T,
	): Promise<InstanceType<T>> {
		const { data } = await this.store
			.get({ settingId: SettingsClass.settingId, storeId: this.storeId })
			.go();

		const parsed = data?.data ? CustomJson.fromJson(data.data) : {};

		// @ts-expect-error - this inherits from an abstract class
		return new SettingsClass(parsed, async (saveData: string) => {
			await this.store
				.upsert({
					settingId: SettingsClass.settingId,
					storeId: this.storeId,
					data: saveData,
				})
				.go();
		});
	}
}

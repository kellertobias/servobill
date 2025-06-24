import { shouldRegister } from '../../services/should-register';
import { RELATIONAL_REPOSITORY_TEST_SET } from '../di-tokens';

import { SettingsOrmEntity } from './relational-orm-entity';
import type { SettingsRepository } from './interface';
import { SETTINGS_REPOSITORY, SETTINGS_REPO_NAME } from './di-tokens';

import { Inject, Service } from '@/common/di';
import { Logger } from '@/backend/services/logger.service';
import type { RelationalDbService } from '@/backend/services/relationaldb.service';
import { AbstractRelationalRepository } from '@/backend/repositories/abstract-relational-repository';
import {
	SettingsEntity,
	AbstractSettingsEntity,
} from '@/backend/entities/settings.entity';
import { DatabaseType } from '@/backend/services/constants';
import { CustomJson } from '@/common/json';
import {
	EVENTBUS_SERVICE,
	RELATIONALDB_SERVICE,
} from '@/backend/services/di-tokens';
import type { EventBusService } from '@/backend/services/eventbus.service';

const storeId = 'settings';

@Service({
	name: SETTINGS_REPOSITORY,
	...shouldRegister([DatabaseType.POSTGRES, DatabaseType.SQLITE]),
	addToTestSet: [RELATIONAL_REPOSITORY_TEST_SET],
})
/**
 * Relational DB implementation of the SettingsRepository interface.
 */
export class SettingsRelationalRepository
	extends AbstractRelationalRepository<SettingsOrmEntity, SettingsEntity, []>
	implements SettingsRepository
{
	protected logger = new Logger(SETTINGS_REPO_NAME);

	constructor(
		@Inject(RELATIONALDB_SERVICE) db: RelationalDbService,
		@Inject(EVENTBUS_SERVICE) protected eventBus: EventBusService,
	) {
		super({ db, ormEntityClass: SettingsOrmEntity });
	}

	/**
	 * Converts a TypeORM SettingsOrmEntity to a domain SettingsEntity.
	 */
	protected ormToDomainEntitySafe(orm: SettingsOrmEntity): SettingsEntity {
		return new SettingsEntity({
			settingId: orm.settingId,
			data: orm.data,
		});
	}

	/**
	 * Converts a domain SettingsEntity to a TypeORM SettingsOrmEntity.
	 */
	protected domainToOrmEntity(domain: SettingsEntity): SettingsOrmEntity {
		return {
			settingId: domain.settingId,
			storeId: storeId,
			data: domain.data,
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
		await this.initialized.promise;
		await this.repository!.save({
			settingId: setting.settingId,
			storeId: storeId,
			data: setting.data,
		});
	}

	/**
	 * Retrieves a settings record as a typed settings class instance (legacy/original API).
	 * @param SettingsClass The settings class constructor (must extend AbstractSettingsEntity)
	 * @returns An instance of the settings class, with data and save method.
	 */
	public async getSetting<T extends typeof AbstractSettingsEntity>(
		SettingsClass: T,
	): Promise<InstanceType<T>> {
		await this.initialized.promise;
		const found = await this.repository!.findOneBy({
			settingId: SettingsClass.settingId,
			storeId,
		});
		const parsed = found && found.data ? CustomJson.fromJson(found.data) : {};

		// @ts-expect-error - this inherits from an abstract class
		return new SettingsClass(parsed, async (saveData: string) => {
			await this.repository!.save({
				settingId: SettingsClass.settingId,
				storeId: storeId,
				data: saveData,
			});
		});
	}
}

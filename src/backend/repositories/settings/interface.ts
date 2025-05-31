import { AbstractRepositoryInterface } from '../abstract-repository';

import {
	SettingsEntity,
	AbstractSettingsEntity,
} from '@/backend/entities/settings.entity';

/**
 * Interface for all Settings repositories (DynamoDB, Postgres, SQLite).
 */
export type SettingsRepository = AbstractRepositoryInterface<
	SettingsEntity,
	[],
	{
		/**
		 * Retrieves a settings record as a typed settings class instance (legacy/original API).
		 * @param SettingsClass The settings class constructor (must extend AbstractSettingsEntity)
		 * @returns An instance of the settings class, with data and save method.
		 */
		getSetting<T extends typeof AbstractSettingsEntity>(
			SettingsClass: T,
		): Promise<InstanceType<T>>;
		/**
		 * Saves a settings record (upsert).
		 */
		save(setting: SettingsEntity): Promise<void>;
	}
>;

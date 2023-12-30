import { DBService } from '../services/dynamodb.service';
import { AbstractSettingsEntity } from '../entities/settings.entity';

import { CustomJson } from '@/common/json';
import { ObjectProperties } from '@/common/ts-helpers';
import { Inject, Service } from '@/common/di';

const entitySchema = DBService.getSchema({
	model: {
		entity: 'customer',
		version: '1',
		service: 'customer',
	},
	attributes: {
		storeId: {
			type: 'string',
			required: true,
		},
		settingId: {
			type: 'string',
			required: true,
		},
		data: {
			type: 'string',
			required: true,
		},
	},
	indexes: {
		byId: {
			pk: {
				field: 'pk',
				composite: ['settingId'],
			},
			sk: {
				field: 'sk',
				composite: ['storeId'],
			},
		},
	},
});

@Service()
export class SettingsRepository {
	private storeId = 'settings';
	private store: typeof entitySchema.entityStoreType;
	constructor(@Inject(DBService) private dynamoDb: DBService) {
		this.store = this.dynamoDb.getEntity(entitySchema.schema);
	}

	private async getById<T>(settingId: string): Promise<T | null> {
		const { data } = await this.store
			.get({
				settingId,
				storeId: this.storeId,
			})
			.go();

		if (!data) {
			return null;
		}

		return CustomJson.fromJson(data?.data || '{}') as T;
	}

	private async save(settingId: string, data: string): Promise<void> {
		await this.store
			.upsert({
				settingId: settingId,
				storeId: this.storeId,
				data,
			})
			.go();
	}

	public async getSetting<T extends typeof AbstractSettingsEntity>(
		SettingsClass: T,
	): Promise<InstanceType<T>> {
		const setting = await this.getById<ObjectProperties<T>>(
			SettingsClass.settingId,
		);

		//@ts-expect-error - this inherits from an abstract class
		return new SettingsClass(setting || {}, async (data: string) => {
			await this.save(SettingsClass.settingId, data);
		});
	}
}

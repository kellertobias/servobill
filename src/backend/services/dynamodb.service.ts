import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Entity, ResponseItem, Schema } from 'electrodb';

import type { ConfigService } from './config.service';
import { DatabaseType } from './constants';
import { shouldRegister } from './should-register';
import { CONFIG_SERVICE } from './di-tokens';

import { Inject, Service } from '@/common/di';

@Service({
	singleton: true,
	...shouldRegister(DatabaseType.DYNAMODB),
})
export class DynamoDBService {
	private client: DynamoDBClient;
	private table: string;

	constructor(@Inject(CONFIG_SERVICE) private readonly config: ConfigService) {
		if (!this.config.tables.electordb) {
			throw new Error('DynamoDB endpoint is not configured');
		}

		const dynamodbOptions = {
			...(this.config.endpoints.dynamodb
				? {
						endpoint: this.config.endpoints.dynamodb,
					}
				: {}),
			region: this.config.region,
			credentials:
				this.config.awsCreds.accessKeyId && this.config.awsCreds.secretAccessKey
					? {
							accessKeyId: this.config.awsCreds.accessKeyId,
							secretAccessKey: this.config.awsCreds.secretAccessKey,
						}
					: undefined,
		};
		this.client = new DynamoDBClient(dynamodbOptions);
		this.table = this.config.tables.electordb;
	}

	public static getSchema<
		A extends string,
		F extends string,
		C extends string,
		S extends Schema<A, F, C>,
	>(schema: S) {
		return {
			schema: schema as S,
			entityStoreType: {} as Entity<string, string, string, S>,
			responseItem: {} as ResponseItem<string, string, string, S>,
		};
	}

	public getEntity<
		A extends string,
		F extends string,
		C extends string,
		S extends Schema<A, F, C>,
	>(schema: S): Entity<A, F, C, S> {
		return new Entity(schema, { client: this.client, table: this.table });
	}
}

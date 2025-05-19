import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Entity, ResponseItem, Schema } from 'electrodb';

import { ConfigService, DatabaseType } from './config.service';

import { Inject, Service } from '@/common/di';
import { shouldRegister } from './should-register';

@Service({
	singleton: true,
	...shouldRegister(DatabaseType.DYNAMODB),
})
export class DBService {
	private client: DynamoDBClient;
	private table: string;

	constructor(@Inject(ConfigService) private readonly config: ConfigService) {
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

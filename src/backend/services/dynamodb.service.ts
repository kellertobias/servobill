import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Entity, ResponseItem, Schema } from 'electrodb';

import { ConfigService } from './config.service';

import { Inject, Service } from '@/common/di';

@Service()
export class DBService {
	private client: DynamoDBClient;
	private table: string;

	constructor(
		@Inject(ConfigService) private readonly configuration: ConfigService,
	) {
		const dynamodbOptions = {
			...(this.configuration.endpoints.dynamodb
				? {
						endpoint: this.configuration.endpoints.dynamodb,
					}
				: {}),
			region: this.configuration.region,
			credentials:
				this.configuration.awsCreds.accessKeyId &&
				this.configuration.awsCreds.secretAccessKey
					? {
							accessKeyId: this.configuration.awsCreds.accessKeyId,
							secretAccessKey: this.configuration.awsCreds.secretAccessKey,
						}
					: undefined,
		};
		this.client = new DynamoDBClient(dynamodbOptions);
		this.table = this.configuration.tables.electordb;
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

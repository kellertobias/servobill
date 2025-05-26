import 'reflect-metadata';
import { describe, it, expect, beforeAll } from 'vitest';
import { DBService } from './dynamodb.service';
import { ConfigService, DatabaseType } from './config.service';
import { Entity } from 'electrodb';
import {
	DynamoDBClient,
	CreateTableCommand,
	ListTablesCommand,
} from '@aws-sdk/client-dynamodb';

// These are imported from the testcontainers setup
import { DYNAMODB_PORT } from '../../../vitest.setup-e2e';

/**
 * Minimal ElectroDB schema for testing
 */
const testSchema = {
	model: {
		entity: 'TestEntity',
		version: '1',
		service: 'test',
	},
	attributes: {
		pk: { type: 'string', required: true },
		sk: { type: 'string', required: true },
		value: { type: 'string' },
	},
	indexes: {
		primary: {
			pk: {
				field: 'pk',
				template: '${pk}',
			},
			sk: {
				field: 'sk',
				template: '${sk}',
			},
		},
	},
} as any;

const TABLE_NAME = 'test-table';

async function ensureTableExists() {
	const client = new DynamoDBClient({
		region: 'eu-central-1',
		endpoint: `http://localhost:${DYNAMODB_PORT}`,
		credentials: {
			accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
			secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
		},
	});
	const tables = await client.send(new ListTablesCommand({}));
	if (!tables.TableNames?.includes(TABLE_NAME)) {
		await client.send(
			new CreateTableCommand({
				TableName: TABLE_NAME,
				AttributeDefinitions: [
					{ AttributeName: 'pk', AttributeType: 'S' },
					{ AttributeName: 'sk', AttributeType: 'S' },
				],
				KeySchema: [
					{ AttributeName: 'pk', KeyType: 'HASH' },
					{ AttributeName: 'sk', KeyType: 'RANGE' },
				],
				BillingMode: 'PAY_PER_REQUEST',
			}),
		);
		// Wait a moment for the table to become active
		await new Promise((res) => setTimeout(res, 1000));
	}
}

describe('DBService (DynamoDB) E2E', () => {
	let dbService: DBService;
	let entity: Entity<any, any, any, any>;

	beforeAll(async () => {
		await ensureTableExists();
		const config = {
			tables: {
				electordb: TABLE_NAME,
				databaseType: DatabaseType.DYNAMODB,
			},
			endpoints: {
				dynamodb: `http://localhost:${DYNAMODB_PORT}`,
			},
			region: 'eu-central-1',
			awsCreds: {
				accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
				secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
			},
		};
		dbService = new DBService({ ...config } as unknown as ConfigService);
		entity = dbService.getEntity(testSchema);
	});

	it('should put and get an item', async () => {
		const pk = 'test#1';
		const sk = 'meta#1';
		await entity.put({ pk, sk, value: 'hello' }).go();
		const { data } = await entity.get({ pk, sk }).go();
		expect(data).toBeDefined();
		expect(data?.value).toBe('hello');
	});

	it('should delete the item', async () => {
		const pk = 'test#1';
		const sk = 'meta#1';
		await entity.delete({ pk, sk }).go();
		const { data } = await entity.get({ pk, sk }).go();
		expect(data).toBeNull();
	});
});

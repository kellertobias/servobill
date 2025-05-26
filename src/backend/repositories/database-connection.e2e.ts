import { describe, it, expect } from 'vitest';
import {
	DYNAMODB_PORT,
	POSTGRES_PORT,
	POSTGRES_USER,
	POSTGRES_PASSWORD,
	POSTGRES_DB,
} from '../../../vitest.setup-e2e';
import { DynamoDB } from 'aws-sdk';
import { DataSource } from 'typeorm';

// Simple e2e test for DynamoDB and Postgres connection

describe('Repository E2E: Connection', () => {
	it('should connect to DynamoDB and list tables', async () => {
		const dynamodb = new DynamoDB({
			region: 'eu-central-1',
			endpoint: `http://localhost:${DYNAMODB_PORT}`,
			accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
			secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
		});
		const tables = await dynamodb.listTables().promise();
		expect(tables).toHaveProperty('TableNames');
	});

	it('should connect to Postgres (relational DB)', async () => {
		const dataSource = new DataSource({
			type: 'postgres',
			host: 'localhost',
			port: POSTGRES_PORT,
			username: POSTGRES_USER,
			password: POSTGRES_PASSWORD,
			database: POSTGRES_DB,
		});
		await dataSource.initialize();
		expect(dataSource.isInitialized).toBe(true);
		await dataSource.destroy();
	});
});

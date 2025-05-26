import {
	CreateTableCommand,
	DynamoDBClient,
	ListTablesCommand,
	DescribeTableCommand,
	DeleteTableCommand,
} from '@aws-sdk/client-dynamodb';
import { DYNAMODB_PORT } from './vitest.setup-e2e';

export const DYNAMODB_TABLE_NAME = 'test-table';

/**
 * Ensures the DynamoDB table exists for testing.
 */
export async function ensureDynamoTableExists() {
	const client = new DynamoDBClient({
		region: 'eu-central-1',
		endpoint: `http://localhost:${DYNAMODB_PORT}`,
		credentials: {
			accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
			secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
		},
	});
	const tables = await client.send(new ListTablesCommand({}));
	if (tables.TableNames?.includes(DYNAMODB_TABLE_NAME)) {
		// Delete the table if it exists
		await client.send(
			new DeleteTableCommand({ TableName: DYNAMODB_TABLE_NAME }),
		);
		// Wait for the table to be deleted
		let exists = true;
		while (exists) {
			await new Promise((res) => setTimeout(res, 500));
			const currentTables = await client.send(new ListTablesCommand({}));
			exists = currentTables.TableNames?.includes(DYNAMODB_TABLE_NAME) ?? false;
		}
		// Add a delay to let DynamoDB Local fully clean up
		await new Promise((res) => setTimeout(res, 1500));
	}
	// Now create the table
	await client.send(
		new CreateTableCommand({
			TableName: DYNAMODB_TABLE_NAME,
			AttributeDefinitions: [
				{ AttributeName: 'pk', AttributeType: 'S' },
				{ AttributeName: 'sk', AttributeType: 'S' },
				{ AttributeName: 'gsi1pk', AttributeType: 'S' },
				{ AttributeName: 'gsi1sk', AttributeType: 'S' },
			],
			KeySchema: [
				{ AttributeName: 'pk', KeyType: 'HASH' },
				{ AttributeName: 'sk', KeyType: 'RANGE' },
			],
			BillingMode: 'PAY_PER_REQUEST',
			GlobalSecondaryIndexes: [
				{
					IndexName: 'gsi1pk-gsi1sk-index',
					KeySchema: [
						{ AttributeName: 'gsi1pk', KeyType: 'HASH' },
						{ AttributeName: 'gsi1sk', KeyType: 'RANGE' },
					],
					Projection: { ProjectionType: 'ALL' },
				},
			],
		}),
	);
	// Wait for the table to become ACTIVE
	let status = 'CREATING';
	while (status !== 'ACTIVE') {
		await new Promise((res) => setTimeout(res, 500));
		const desc = await client.send(
			new DescribeTableCommand({ TableName: DYNAMODB_TABLE_NAME }),
		);
		status = desc.Table?.TableStatus || '';
	}
}

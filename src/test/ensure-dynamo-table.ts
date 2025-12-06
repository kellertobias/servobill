import {
	CreateTableCommand,
	DescribeTableCommand,
	DynamoDBClient,
} from '@aws-sdk/client-dynamodb';

import { DYNAMODB_PORT } from './vitest.setup-e2e';

/**
 * Ensures the DynamoDB table exists for testing ElectroDB-backed repositories.
 *
 * ElectroDB expects a single-table design with the following structure:
 * - Primary Key: pk (HASH, string) + sk (RANGE, string)
 * - Global Secondary Index (GSI): gsi1pk (HASH, string) + gsi1sk (RANGE, string)
 *
 * All entity types (Customer, Expense, Inventory, etc.) share this table, using different composite key patterns.
 * Only the key attributes (pk, sk, gsi1pk, gsi1sk) need to be defined at table creation; all other attributes are handled at the item level.
 *
 * This function creates the table if it does not exist, and waits for it to become ACTIVE.
 *
 * If you encounter InternalFailure errors in DynamoDB tests, ensure that:
 * - The table and GSI are created as expected (see debug log below).
 * - All attributes written to DynamoDB match the types defined in the ElectroDB schema (e.g., strings for dates).
 * - DynamoDB local is running and healthy.
 */
export async function ensureDynamoTableExists(tableName: string) {
	const client = new DynamoDBClient({
		region: 'eu-central-1',
		endpoint: `http://localhost:${DYNAMODB_PORT}`,
		credentials: {
			accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
			secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
		},
	});
	// Now create the table
	try {
		await client.send(
			new CreateTableCommand({
				TableName: tableName,
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
	} catch (error: unknown) {
		// Ignore if the table is already being created
		if (error instanceof Error && error.name !== 'ResourceInUseException') {
			throw error;
		}
	}
	// Debug: Log the table description after creation to help diagnose schema issues
	const desc = await client.send(
		new DescribeTableCommand({ TableName: tableName }),
	);
	// eslint-disable-next-line no-console
	console.log(
		'[DynamoDB Table Description]',
		JSON.stringify(desc.Table, null, 2),
	);
	// Wait for the table to become ACTIVE
	let status = desc.Table?.TableStatus || 'CREATING';
	while (status !== 'ACTIVE') {
		await new Promise((resolve) => setTimeout(resolve, 50));
		const desc = await client.send(
			new DescribeTableCommand({ TableName: tableName }),
		);
		status = desc.Table?.TableStatus || 'CREATING';
	}
}

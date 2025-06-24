import {
	CreateTableCommand,
	DynamoDBClient,
	DescribeTableCommand,
} from '@aws-sdk/client-dynamodb';

import { DYNAMODB_PORT } from './vitest.setup-e2e';

/**
 * Ensures the DynamoDB table exists for testing.
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
	// Wait for the table to become ACTIVE
	let status = 'CREATING';
	while (status !== 'ACTIVE') {
		await new Promise((resolve) => setTimeout(resolve, 50));
		const desc = await client.send(
			new DescribeTableCommand({ TableName: tableName }),
		);
		status = desc.Table?.TableStatus || '';
	}
}

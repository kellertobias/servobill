import {
	DeleteItemCommand,
	DynamoDBClient,
	ScanCommand,
} from '@aws-sdk/client-dynamodb';

/**
 * Clears all items from the specified DynamoDB table.
 *
 * @param tableName - The name of the DynamoDB table to clear.
 * @param port - The port where DynamoDB is running (e.g., DYNAMODB_PORT).
 * @param region - The AWS region (default: 'eu-central-1').
 * @param accessKeyId - The AWS access key ID (default: test credentials).
 * @param secretAccessKey - The AWS secret access key (default: test credentials).
 */
export async function clearDynamoTable({
	tableName,
	port,
	region = 'eu-central-1',
	accessKeyId = 'AKIAIOSFODNN7EXAMPLE',
	secretAccessKey = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
}: {
	tableName: string;
	port: number;
	region?: string;
	accessKeyId?: string;
	secretAccessKey?: string;
}) {
	const client = new DynamoDBClient({
		region,
		endpoint: `http://localhost:${port}`,
		credentials: {
			accessKeyId,
			secretAccessKey,
		},
	});
	const scan = await client.send(new ScanCommand({ TableName: tableName }));
	if (scan.Items) {
		for (const item of scan.Items) {
			await client.send(
				new DeleteItemCommand({
					TableName: tableName,
					Key: {
						pk: item.pk,
						sk: item.sk,
					},
				}),
			);
		}
	}
}

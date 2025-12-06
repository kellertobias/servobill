import {
  CreateTableCommand,
  DynamoDBClient,
  type ProjectionType,
  type ScalarAttributeType,
} from '@aws-sdk/client-dynamodb';

import { tableDefinitions } from './definitions/tables';

const projectionTypes: Record<string, ProjectionType> = {
  all: 'ALL',
  keys: 'KEYS_ONLY',
  include: 'INCLUDE',
};

export const initializeDynamoDB = async (endpoint: string) => {
  // eslint-disable-next-line no-console
  console.log('Creating DynamoDB Client', {
    endpoint,
  });

  const client = new DynamoDBClient({
    endpoint,
    region: 'local',
  });

  // eslint-disable-next-line no-console
  console.log('Creating DynamoDB Tables');
  for (const [tableName, tableDefinition] of Object.entries(tableDefinitions)) {
    // eslint-disable-next-line no-console
    console.log(`Creating DynamoDB Table ${tableName}`);
    try {
      const result = await client.send(
        new CreateTableCommand({
          TableName: tableName,
          BillingMode: 'PAY_PER_REQUEST',
          KeySchema: [
            {
              AttributeName: tableDefinition.primaryIndex.partitionKey,
              KeyType: 'HASH',
            },
            {
              AttributeName: tableDefinition.primaryIndex.sortKey,
              KeyType: 'RANGE',
            },
          ],
          GlobalSecondaryIndexes: Object.entries(tableDefinition.globalIndexes).map(
            ([indexName, indexDefinition]) => ({
              IndexName: indexName,
              KeySchema: [
                {
                  AttributeName: indexDefinition.partitionKey,
                  KeyType: 'HASH',
                },
                {
                  AttributeName: indexDefinition.sortKey,
                  KeyType: 'RANGE',
                },
              ],
              Projection: {
                ProjectionType: projectionTypes[indexDefinition.projection?.toUpperCase()] || 'ALL',
              },
            })
          ),
          AttributeDefinitions: [
            {
              AttributeName: tableDefinition.primaryIndex.partitionKey,
              AttributeType: 'S',
            },
            {
              AttributeName: tableDefinition.primaryIndex.sortKey,
              AttributeType: 'S',
            },
            ...Object.values(tableDefinition.globalIndexes).flatMap(
              (
                indexDefinition
              ): {
                AttributeName: string;
                AttributeType: ScalarAttributeType;
              }[] => [
                {
                  AttributeName: indexDefinition.partitionKey,
                  AttributeType: 'S',
                },
                {
                  AttributeName: indexDefinition.sortKey,
                  AttributeType: 'S',
                },
              ]
            ),
          ],
        })
      );
      // eslint-disable-next-line no-console
      console.log(result);
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.log(`Error creating table ${tableName}`);

      if (error instanceof Error) {
        if (error.name === 'ResourceInUseException') {
          // eslint-disable-next-line no-console
          console.log('Table already exists');
        } else if (error.name === 'SyntaxError') {
          // eslint-disable-next-line no-console
          console.log("Error: Couldn't parse response body");
          // eslint-disable-next-line no-console
          console.log(error);
        } else {
          // eslint-disable-next-line no-console
          console.log(error);
        }
      } else {
        // eslint-disable-next-line no-console
        console.log(error);
      }
    }
  }
};

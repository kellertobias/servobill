import { initializeDynamoDB } from './dynamodb';
import { initializeS3 } from './s3';

// eslint-disable-next-line unicorn/prefer-top-level-await
(async () => {
  const dynamoDbEndpoint = process.env.ENDPOINT_DYNAMODB;
  if (!dynamoDbEndpoint) {
    throw new Error('Missing ENDPOINT_DYNAMODB');
  }
  const s3Endpoint = process.env.ENDPOINT_S3;
  if (!s3Endpoint) {
    throw new Error('Missing ENDPOINT_S3');
  }
  await initializeDynamoDB(dynamoDbEndpoint);
  await initializeS3(s3Endpoint);
})();

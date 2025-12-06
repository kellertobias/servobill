import { CreateBucketCommand, PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3';

import { bucketDefinitions } from './definitions/buckets';

export const initializeS3 = async (endpoint: string) => {
  const client = new S3Client({
    endpoint,
    region: 'local',
    disableHostPrefix: true,
    forcePathStyle: true,
    tls: false,
  });

  // eslint-disable-next-line no-console
  console.log('Creating S3 Buckets');
  for (const { name, cors } of Object.values(bucketDefinitions)) {
    // eslint-disable-next-line no-console
    console.log(`Creating S3 Bucket ${name}`);
    try {
      const result = await client.send(
        new CreateBucketCommand({
          Bucket: name,
        })
      );
      // eslint-disable-next-line no-console
      console.log(result);
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.log(`Error creating bucket ${name}`);

      if (error instanceof Error) {
        if (error.name === 'ResourceInUseException') {
          // eslint-disable-next-line no-console
          console.log('Bucket already exists');
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

    try {
      if (cors) {
        // eslint-disable-next-line no-console
        console.log(`Creating CORS configuration for ${name}`);
        await client.send(
          new PutBucketCorsCommand({
            Bucket: name,
            CORSConfiguration: {
              CORSRules: [
                {
                  AllowedHeaders: ['*'],
                  AllowedMethods: ['GET', 'PUT'],
                  AllowedOrigins: ['*'],
                  MaxAgeSeconds: 3000,
                },
              ],
            },
          })
        );
      }
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.log(`Error creating CORS configuration for ${name}`);

      if (error instanceof Error) {
        if (error.name === 'NoSuchBucket') {
          // eslint-disable-next-line no-console
          console.log('Bucket does not exist');
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

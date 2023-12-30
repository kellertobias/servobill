import {
	CreateBucketCommand,
	PutBucketCorsCommand,
	S3Client,
} from '@aws-sdk/client-s3';

import { bucketDefinitions } from './definitions/buckets';

export const initializeS3 = async (endpoint: string) => {
	const client = new S3Client({
		endpoint,
		region: 'local',
		disableHostPrefix: true,
		forcePathStyle: true,
		tls: false,
	});

	console.log('Creating S3 Buckets');
	for (const { name, cors } of Object.values(bucketDefinitions)) {
		console.log(`Creating S3 Bucket ${name}`);
		try {
			const result = await client.send(
				new CreateBucketCommand({
					Bucket: name,
				}),
			);
			console.log(result);
		} catch (error: unknown) {
			console.log(`Error creating bucket ${name}`);

			if (error instanceof Error) {
				if (error.name === 'ResourceInUseException') {
					console.log('Bucket already exists');
				} else if (error.name === 'SyntaxError') {
					console.log("Error: Couldn't parse response body");
					console.log(error);
				} else {
					console.log(error);
				}
			} else {
				console.log(error);
			}
		}

		try {
			if (cors) {
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
					}),
				);
			}
		} catch (error: unknown) {
			console.log(`Error creating CORS configuration for ${name}`);

			if (error instanceof Error) {
				if (error.name === 'NoSuchBucket') {
					console.log('Bucket does not exist');
				} else if (error.name === 'SyntaxError') {
					console.log("Error: Couldn't parse response body");
					console.log(error);
				} else {
					console.log(error);
				}
			} else {
				console.log(error);
			}
		}
	}
};

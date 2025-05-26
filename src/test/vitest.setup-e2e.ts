// Register ConfigService in DI container BEFORE any other imports
import { DefaultContainer } from '@/common/di';
import { CONFIG_SERVICE } from '@/backend/services/di-tokens';
import { DatabaseType } from '@/backend/services/constants';

if (DefaultContainer.isBound(CONFIG_SERVICE)) {
	DefaultContainer.unbind(CONFIG_SERVICE);
}
DefaultContainer.bind(CONFIG_SERVICE).toConstantValue({
	tables: {
		electordb: 'test-table',
		databaseType: DatabaseType.DYNAMODB,
		postgres: `postgresql://test:test@localhost:5432/test`,
		sqlite: undefined,
	},
	endpoints: {
		dynamodb: `http://localhost:8000`,
		s3: undefined,
		sqs: undefined,
		eventbridge: undefined,
		ses: undefined,
	},
	awsCreds: {
		accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
		secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
	},
	port: 3000,
	domains: { api: 'localhost:3000', site: 'localhost:3000' },
	region: 'eu-central-1',
	eventBusName: 'default',
	buckets: { files: 'test-bucket' },
	isLocal: true,
	ses: { accessKeyId: undefined, secretAccessKey: undefined },
	relationalDatabase: {},
});

// Now import the rest of the test dependencies
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { beforeAll, afterAll } from 'vitest';

// Containers
let dynamoContainer: StartedTestContainer;
let s3Container: StartedTestContainer;
let postgresContainer: StartedTestContainer;

// Exports for test use
export let DYNAMODB_PORT: number;
export let S3_PORT: number;
export let POSTGRES_PORT: number;
export let POSTGRES_USER = 'test';
export let POSTGRES_PASSWORD = 'test';
export let POSTGRES_DB = 'test';

beforeAll(async () => {
	// Start DynamoDB Local
	dynamoContainer = await new GenericContainer('amazon/dynamodb-local:latest')
		.withExposedPorts(9321)
		.withCommand([
			'-jar',
			'DynamoDBLocal.jar',
			'-sharedDb',
			'-dbPath',
			'./data',
			'-port',
			'9321',
		])
		.withBindMounts([
			{ source: '/tmp/dynamodb-data', target: '/home/dynamodblocal/data' },
		])
		.withWorkingDir('/home/dynamodblocal')
		.start();
	DYNAMODB_PORT = dynamoContainer.getMappedPort(9321);

	// Rebind CONFIG_SERVICE with the correct DynamoDB port after container starts
	if (DefaultContainer.isBound(CONFIG_SERVICE)) {
		DefaultContainer.unbind(CONFIG_SERVICE);
	}
	DefaultContainer.bind(CONFIG_SERVICE).toConstantValue({
		tables: {
			electordb: 'test-table',
			databaseType: DatabaseType.DYNAMODB,
			postgres: `postgresql://test:test@localhost:5432/test`,
			sqlite: undefined,
		},
		endpoints: {
			dynamodb: `http://localhost:${DYNAMODB_PORT}`,
			s3: undefined,
			sqs: undefined,
			eventbridge: undefined,
			ses: undefined,
		},
		awsCreds: {
			accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
			secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
		},
		port: 3000,
		domains: { api: 'localhost:3000', site: 'localhost:3000' },
		region: 'eu-central-1',
		eventBusName: 'default',
		buckets: { files: 'test-bucket' },
		isLocal: true,
		ses: { accessKeyId: undefined, secretAccessKey: undefined },
		relationalDatabase: {},
	});

	// Start MinIO (S3)
	s3Container = await new GenericContainer('quay.io/minio/minio')
		.withExposedPorts(9000)
		.withEnvironment({
			MINIO_ACCESS_KEY: 'AKIAIOSFODNN7EXAMPLE',
			MINIO_SECRET_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
			MINIO_API_CORS_ALLOW_ORIGIN: '*',
		})
		.withCommand(['server', '/data', '--console-address', ':9320'])
		.withBindMounts([{ source: '/tmp/s3-data', target: '/data' }])
		.start();
	S3_PORT = s3Container.getMappedPort(9000);

	// Start Postgres
	postgresContainer = await new GenericContainer('postgres:15-alpine')
		.withExposedPorts(5432)
		.withEnvironment({
			POSTGRES_USER,
			POSTGRES_PASSWORD,
			POSTGRES_DB,
		})
		.withWaitStrategy(
			Wait.forLogMessage('database system is ready to accept connections'),
		)
		.start();
	POSTGRES_PORT = postgresContainer.getMappedPort(5432);
});

// Stop containers after all tests
afterAll(async () => {
	await dynamoContainer?.stop();
	await s3Container?.stop();
	await postgresContainer?.stop();
});

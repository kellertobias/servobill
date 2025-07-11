/* eslint-disable import/no-extraneous-dependencies */
import 'reflect-metadata';
import fs from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';

import type { TestProject } from 'vitest/node';
import pg from 'pg';
// Now import the rest of the test dependencies
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

// Register ConfigService in DI container BEFORE any other imports
import { DatabaseType } from '@/backend/services/constants';
import { App } from '@/common/di';

process.env.VITEST = 'true';

// Containers
let dynamoContainer: StartedTestContainer;
let s3Container: StartedTestContainer;
let postgresContainer: StartedTestContainer;

// Exports for test use
let DYNAMODB_PORT = -1;
let S3_PORT = -1;
let POSTGRES_PORT = -1;
const POSTGRES_USER = 'test';
const POSTGRES_PASSWORD = 'test';
const POSTGRES_DB = 'test';

const MUSTANG_JAR_PATH = 'node_modules/Mustang/Mustang-CLI.jar';

App.skipDefaultRegistration = true;

const tryConnection = async (connect: () => Promise<void>, retries = 15) => {
	for (let i = 0; i < retries; i++) {
		try {
			await connect();
			return true;
		} catch {
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}
	return false;
};

let teardownHappened = false;

export default async function globalSetup(project: TestProject) {
	// eslint-disable-next-line no-console
	console.log('Starting Global Test Setup...');
	const start = Date.now();

	const runDynamo =
		!process.env.VITEST_REPOTYPE ||
		process.env.VITEST_REPOTYPE === 'all' ||
		process.env.VITEST_REPOTYPE === DatabaseType.DYNAMODB;

	const runPostgres =
		!process.env.VITEST_REPOTYPE ||
		process.env.VITEST_REPOTYPE === 'all' ||
		process.env.VITEST_REPOTYPE === DatabaseType.POSTGRES;

	await Promise.all([
		(async () => {
			if (runDynamo) {
				dynamoContainer = await new GenericContainer(
					'amazon/dynamodb-local:latest',
				)
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
						{
							source: '/tmp/dynamodb-data',
							target: '/home/dynamodblocal/data',
						},
					])
					.withWorkingDir('/home/dynamodblocal')
					.start();

				DYNAMODB_PORT = dynamoContainer.getMappedPort(9321);

				if (
					!(await tryConnection(async () => {
						await fetch(`http://localhost:${DYNAMODB_PORT}/`);
					}))
				) {
					throw new Error('Failed to connect to dynamodb');
				}
			}
		})(),
		(async () => {
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

			if (
				!(await tryConnection(async () => {
					// try connecting to the s3 mock with fetch
					await fetch(`http://localhost:${S3_PORT}/`);
				}))
			) {
				throw new Error('Failed to connect to s3');
			}
		})(),
		(async () => {
			if (runPostgres) {
				postgresContainer = await new GenericContainer('postgres:15-alpine')
					.withExposedPorts(5432)
					.withEnvironment({
						POSTGRES_USER,
						POSTGRES_PASSWORD,
						POSTGRES_DB,
					})
					.withWaitStrategy(
						Wait.forLogMessage(
							'database system is ready to accept connections',
						),
					)
					.start();

				POSTGRES_PORT = postgresContainer.getMappedPort(5432);

				if (
					!(await tryConnection(async () => {
						const client = new pg.Client({
							host: 'localhost',
							port: POSTGRES_PORT,
							user: POSTGRES_USER,
							password: POSTGRES_PASSWORD,
							database: POSTGRES_DB,
						});
						await client.connect();
						await client.end();
					}))
				) {
					throw new Error('Failed to connect to postgres');
				}
			}
		})(),
		(async () => {
			console.log('We need java to check the xml e-invoices.');
			console.log('Checking if java is installed...');
			// now check that java is installed
			const javaVersion = execSync('java -version', {
				encoding: 'utf8',
			});
			console.log(`Java version: ${javaVersion}`);

			// check if the file already exists
			if (fs.existsSync(MUSTANG_JAR_PATH)) {
				console.log(`File already exists at ${MUSTANG_JAR_PATH}`);
				return;
			}

			// make sure the directory exists
			fs.mkdirSync(path.dirname(MUSTANG_JAR_PATH), { recursive: true });

			// download the Mustang CLI and save it to node_modules/Mustang/Mustang-CLI.jar
			const response = await fetch(
				'https://www.mustangproject.org/deploy/Mustang-CLI-2.17.0.jar',
				{
					method: 'GET',
				},
			);

			if (!response.ok) {
				throw new Error(
					`Failed to download file: ${response.status} ${response.statusText}`,
				);
			}

			const arrayBuffer = await response.arrayBuffer();
			const uint8 = new Uint8Array(arrayBuffer);

			await writeFile(MUSTANG_JAR_PATH, uint8);
			console.log(`File downloaded to ${MUSTANG_JAR_PATH}`);
		})(),
	]);

	// eslint-disable-next-line no-console
	console.log(`...took ${Date.now() - start}ms\n\n`);

	project.provide('globalSetup', {
		DYNAMODB_PORT,
		S3_PORT,
		POSTGRES_PORT,
		POSTGRES_USER,
		POSTGRES_PASSWORD,
		POSTGRES_DB,
		MUSTANG_JAR_PATH,
	});

	return async () => {
		if (teardownHappened) {
			throw new Error('teardown called twice');
		}
		teardownHappened = true;
		await dynamoContainer?.stop();
		await s3Container?.stop();
		await postgresContainer?.stop();
	};
}

declare module 'vitest' {
	export interface ProvidedContext {
		globalSetup: {
			DYNAMODB_PORT: number;
			S3_PORT: number;
			POSTGRES_PORT: number;
			POSTGRES_USER: string;
			POSTGRES_PASSWORD: string;
			POSTGRES_DB: string;
			MUSTANG_JAR_PATH: string;
		};
	}
}

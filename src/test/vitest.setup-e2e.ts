/* eslint-disable import/no-extraneous-dependencies */
import 'reflect-metadata';

import { randomUUID } from 'crypto';

import { inject } from 'vitest';

// Register ConfigService in DI container BEFORE any other imports
import { App, DefaultContainer } from '@/common/di';
import { CONFIG_SERVICE } from '@/backend/services/di-tokens';

process.env.VITEST = 'true';
process.env.JWT_SECRET = randomUUID();
process.env.INSECURE_COOKIES = 'true';

// we unbind the default config to avoid it being used in the tests
if (DefaultContainer.isBound(CONFIG_SERVICE)) {
	DefaultContainer.unbind(CONFIG_SERVICE);
}

const globalSetup = inject('globalSetup');

// Exports for test use
export const DYNAMODB_PORT = globalSetup.DYNAMODB_PORT;
export const S3_PORT = globalSetup.S3_PORT;
export const POSTGRES_PORT = globalSetup.POSTGRES_PORT;
export const POSTGRES_USER = globalSetup.POSTGRES_USER;
export const POSTGRES_PASSWORD = globalSetup.POSTGRES_PASSWORD;
export const POSTGRES_DB = globalSetup.POSTGRES_DB;

App.skipDefaultRegistration = true;

// // This code is for debugging test durations with Cursor chat.
// const testCaseStarts = new Map<string, number>();
// beforeEach(async (ctx) => {
// 	console.log(`Starting test: ${ctx.task.suite?.name} -> ${ctx.task.name}`);
// 	testCaseStarts.set(ctx.task.id, Date.now());
// });

// afterEach(async (ctx) => {
// 	const start = testCaseStarts.get(ctx.task.id);
// 	if (start) {
// 		console.log('Test took', Date.now() - start, 'ms');
// 		testCaseStarts.delete(ctx.task.id);
// 	}
// });

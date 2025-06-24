/* eslint-disable unicorn/import-style,unicorn/prefer-module */
import { join } from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		globalSetup: './src/test/vitest.global-setup-e2e.ts',
		setupFiles: ['./src/test/vitest.setup-e2e.ts'],
		include: ['src/**/*.e2e.ts', 'src/**/*.spec.ts'],
		testTimeout: 60000,
		hookTimeout: 60000,
		// Run all test files sequentially to avoid DynamoDB table race conditions
		fileParallelism: false,
		sequence: {
			concurrent: false,
		},
	},
	resolve: {
		alias: {
			'@': join(__dirname, 'src'),
		},
	},
});

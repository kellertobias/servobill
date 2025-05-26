import { defineConfig } from 'vitest/config';
import { join } from 'path';

export default defineConfig({
	test: {
		environment: 'node',
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

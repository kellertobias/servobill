/* eslint-disable unicorn/import-style,unicorn/prefer-module */
import { join } from 'path';

import { defineConfig } from 'vitest/config';

/**
 * Vitest coverage configuration
 *
 * Uses the built-in 'v8' provider for code coverage. This enables coverage reporting when running tests with the --coverage flag or via the test:coverage script.
 * You can customize include/exclude patterns, reporters, and thresholds as needed.
 * See: https://vitest.dev/guide/coverage.html
 */
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
		coverage: {
			provider: 'v8', // Use built-in V8 for coverage (default)
			reporter: ['text', 'html', 'lcov'], // Output coverage in multiple formats
			exclude: [
				'src/test/**',
				'**/*.d.ts',
				'stack/**',
				'templates/**',
				'src/common/gql/**',
				'**/handler.ts',
				'**/event.ts',
				'**/index.ts',
				'**/*.e2e.ts',
				'**/*.spec.ts',
				'**/*.schema.ts',
				'src/backend/instrumentation.ts',
				'**/di-tokens.ts',
			], // Exclude test files and type definitions
			// Optionally, set thresholds to enforce minimum coverage
			// thresholds: {
			//   lines: 80,
			//   functions: 80,
			//   branches: 70,
			//   statements: 80,
			// },
		},
	},
	resolve: {
		alias: {
			'@': join(__dirname, 'src'),
		},
	},
});

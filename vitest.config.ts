import { defineConfig } from 'vitest/config';
import { join } from 'path';

export default defineConfig({
	test: {
		environment: 'node',
		setupFiles: ['./src/test/vitest.setup-e2e.ts'],
		include: ['src/**/*.e2e.ts', 'src/**/*.spec.ts'],
		testTimeout: 60000,
		hookTimeout: 60000,
	},
	resolve: {
		alias: {
			'@': join(__dirname, 'src'),
		},
	},
});

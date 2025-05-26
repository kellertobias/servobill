import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		setupFiles: ['./vitest.setup-e2e.ts'],
		include: ['src/**/*.e2e.ts', 'src/**/*.spec.ts'],
		testTimeout: 60000,
		hookTimeout: 60000,
	},
});

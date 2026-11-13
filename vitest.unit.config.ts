import { join } from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/vitest.setup-unit.ts'],
    include: ['src/**/*.spec.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'src/backend/events/receipt/receipt-structured-extraction.service.spec.ts',
      'src/backend/services/invoice-generators/invoice-generator-matrix.spec.ts',
    ],
    testTimeout: 60000,
    hookTimeout: 60000,
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
    },
  },
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${join(__dirname, 'src')}/` },
      // graphql ships separate CommonJS and ESM builds. type-graphql loads the
      // CommonJS one, so the app code must use it too ("another realm" error).
      {
        find: /^graphql$/,
        replacement: join(__dirname, 'node_modules/graphql/index.js'),
      },
    ],
  },
});

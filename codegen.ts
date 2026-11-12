import type { CodegenConfig } from '@graphql-codegen/cli';

const scalars = { DateTime: 'any' };

const config: CodegenConfig = {
  schema: 'src/schema.gql',
  documents: [
    'src/app/**/*.ts',
    'src/app/**/*.tsx',
    '!src/app/_hooks/load-data.ts',
    '!src/app/_api/import-export/inventory-import-json.tsx',
  ],
  generates: {
    // All schema types (Customer, Invoice, ...) and the enums. Since
    // client-preset 5 the preset itself only emits types used by operations.
    './src/common/gql/schema.ts': {
      plugins: ['typescript'],
      config: {
        scalars,
        // Same shape as operation results: nullable fields are present as null
        avoidOptionals: { field: true, inputValue: false, object: false },
      },
    },
    './src/common/gql/': {
      preset: 'client',
      presetConfig: {
        gqlTagName: 'gql',
      },
      config: {
        scalars,
        // Reuse the enums from schema.ts so values are interchangeable
        // between schema types and operation results.
        enumValues: './schema',
      },
    },
  },
  ignoreNoDocuments: true,
  errorsOnly: true,
};

export default config;

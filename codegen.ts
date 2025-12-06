import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'src/schema.gql',
  documents: [
    'src/app/**/*.ts',
    'src/app/**/*.tsx',
    '!src/app/_hooks/load-data.ts',
    '!src/app/_api/import-export/inventory-import-json.tsx',
  ],
  generates: {
    './src/common/gql/': {
      preset: 'client',
      presetConfig: {
        gqlTagName: 'gql',
      },
    },
  },
  ignoreNoDocuments: true,
  errorsOnly: true,
};

export default config;

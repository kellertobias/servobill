import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
	schema: 'src/schema.gql',
	documents: [
		'src/app/**/*.ts',
		'src/app/**/*.tsx',
		'!src/app/_hooks/load-data.ts',
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

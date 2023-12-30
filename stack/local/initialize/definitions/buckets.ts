import { BucketProps } from 'sst/constructs';

export const bucketDefinitions = {
	'invoice-data': {
		cors: true,
		name: 'invoice-data',
	},
} satisfies Record<string, BucketProps>;

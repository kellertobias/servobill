import 'reflect-metadata';
import { DefaultContainer } from '@/common/di';
import { CONFIG_SERVICE } from '@/backend/services/di-tokens';

if (!DefaultContainer.isBound(CONFIG_SERVICE)) {
	DefaultContainer.bind(CONFIG_SERVICE).toConstantValue({
		fileStorage: { type: 'LOCAL' },
	} as any);
}

process.env.JWT_SECRET = 'test-secret';
process.env.APP_URL = 'http://localhost:3000';
process.env.AWS_REGION = 'eu-central-1';
process.env.BUCKET_NAME = 'test-bucket';
process.env.TABLE_NAME = 'test-table';

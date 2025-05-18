import { Service } from '@/common/di';

@Service()
export class ConfigService {
	public readonly endpoints: Record<
		's3' | 'dynamodb' | 'sqs' | 'eventbridge' | 'ses',
		string | undefined
	>;
	public readonly tables: { electordb: string };
	public readonly awsCreds: {
		accessKeyId: string | undefined;
		secretAccessKey: string | undefined;
	};
	public readonly port: string | number;
	public readonly domains: { api: string; site: string };
	public readonly region: string;
	public readonly eventBusName: string;
	public readonly buckets: { files: string };
	public readonly isLocal = process.env.IS_OFFLINE === 'true';
	public readonly ses: {
		accessKeyId: string | undefined;
		secretAccessKey: string | undefined;
	};
	public readonly relationalDatabase?: {
		sqlite: string | undefined;
		postgres: string | undefined;
	};

	constructor() {
		this.port = process.env.PORT || 3000;
		this.region = process.env.AWS_REGION || 'eu-central-1';
		this.domains = {
			api: process.env.SITE_DOMAIN
				? `api.${process.env.SITE_DOMAIN}`
				: 'localhost:3000',
			site: process.env.SITE_DOMAIN || 'localhost:3000',
		};
		this.awsCreds = {
			accessKeyId: process.env.FAKE_AWS_ACCESS_KEY_ID,
			secretAccessKey: process.env.FAKE_AWS_SECRET_ACCESS_KEY,
		};
		this.endpoints = {
			dynamodb: process.env.ENDPOINT_DYNAMODB,
			s3: process.env.ENDPOINT_S3,
			sqs: process.env.ENDPOINT_SQS,
			eventbridge: process.env.ENDPOINT_EVENTBRIDGE,
			ses: process.env.ENDPOINT_SES,
		};
		this.eventBusName = process.env.EVENT_BUS_NAME || 'default';
		this.tables = {
			electordb: process.env.TABLE_ELECTRODB!,
		};
		this.relationalDatabase =
			process.env.SQLITE_PATH || process.env.POSTGRES_URL
				? {
						sqlite: process.env.SQLITE_PATH,
						postgres: process.env.POSTGRES_URL,
					}
				: undefined;
		this.buckets = {
			files: process.env.BUCKET_FILES!,
		};
		this.ses = {
			accessKeyId: process.env.SES_ACCESS_KEY_ID,
			secretAccessKey: process.env.SES_SECRET_ACCESS_KEY,
		};
	}
}

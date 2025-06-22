import { CONFIG_SERVICE } from './di-tokens';
import {
	DatabaseType,
	FileStorageType,
	EmailType,
	LLMProvider,
} from './constants';

import { Service } from '@/common/di';

/**
 * Type for email configuration, supporting both SES and SMTP
 */
export type EmailConfig =
	| {
			type: EmailType.SES;
			accessKeyId?: string;
			secretAccessKey?: string;
	  }
	| {
			type: EmailType.SMTP;
			host: string;
			port: number;
			user: string;
			password: string;
			from: string;
			fromName?: string;
	  };

@Service(CONFIG_SERVICE)
export class ConfigService {
	public readonly endpoints: Record<
		's3' | 'dynamodb' | 'eventbridge' | 'ses',
		string | undefined
	>;
	public readonly tables: {
		electordb: string | undefined;
		sqlite: string | undefined;
		postgres: string | undefined;
		databaseType: DatabaseType;
	};
	public readonly awsCreds: {
		accessKeyId: string | undefined;
		secretAccessKey: string | undefined;
	};
	public readonly llm: {
		provider: LLMProvider;
		apiKey: string;
		baseUrl?: string;
		model?: string;
	} | null;
	public readonly port: string | number;
	public readonly domains: { api: string; site: string };
	public readonly region: string;
	public readonly eventBusName: string;
	public readonly buckets: { files: string };
	public readonly isLocal = process.env.IS_OFFLINE === 'true';
	public readonly email: EmailConfig;

	public readonly fileStorage:
		| {
				type: FileStorageType;
				baseDirectory: string;
		  }
		| {
				type: FileStorageType.S3;
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
			eventbridge: process.env.ENDPOINT_EVENTBRIDGE,
			ses: process.env.ENDPOINT_SES,
		};
		this.eventBusName = process.env.EVENT_BUS_NAME || 'default';
		this.tables = {
			databaseType: (() => {
				if (process.env.SQLITE_PATH) {
					return DatabaseType.SQLITE;
				}
				if (process.env.POSTGRES_URL) {
					return DatabaseType.POSTGRES;
				}
				return DatabaseType.DYNAMODB;
			})(),
			electordb: process.env.TABLE_ELECTRODB!,
			sqlite: process.env.SQLITE_PATH,
			postgres: process.env.POSTGRES_URL,
		};
		this.buckets = {
			files: process.env.BUCKET_FILES!,
		};

		// Configure email settings based on environment variables
		this.email = process.env.SMTP_HOST
			? {
					type: EmailType.SMTP,
					host: process.env.SMTP_HOST,
					port: Number.parseInt(process.env.SMTP_PORT || '587', 10),
					user: process.env.SMTP_USER!,
					password: process.env.SMTP_PASSWORD!,
					from: process.env.SMTP_FROM!,
					fromName: process.env.SMTP_FROM_NAME,
				}
			: {
					type: EmailType.SES,
					accessKeyId: process.env.SES_ACCESS_KEY_ID,
					secretAccessKey: process.env.SES_SECRET_ACCESS_KEY,
				};

		this.fileStorage = process.env.UPLOAD_DIRECTORY
			? {
					type: FileStorageType.LOCAL,
					baseDirectory: process.env.UPLOAD_DIRECTORY,
				}
			: {
					type: FileStorageType.S3,
				};

		this.llm = process.env.LLM_PROVIDER
			? {
					provider: process.env.LLM_PROVIDER as LLMProvider,
					apiKey: process.env.LLM_API_KEY!,
					baseUrl: process.env.LLM_BASE_URL,
					model: (() => {
						if (process.env.LLM_MODEL) {
							return process.env.LLM_MODEL;
						}
						if (process.env.LLM_PROVIDER === LLMProvider.OPENAI) {
							return 'gpt-4.1';
						}
						return 'claude-3-5-sonnet-20240620';
					})(),
				}
			: null;
	}

	public get uploadDirectory(): string | undefined {
		return process.env.UPLOAD_DIRECTORY;
	}
}

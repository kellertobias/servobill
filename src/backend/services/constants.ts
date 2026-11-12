export enum DatabaseType {
	SQLITE = 'sqlite',
	POSTGRES = 'postgres',
	DYNAMODB = 'dynamodb',
}

export enum FileStorageType {
	S3 = 's3',
	LOCAL = 'local',
}

/**
 * Enum defining the available email service types
 */
export enum EmailType {
	SES = 'SES',
	SMTP = 'SMTP',
}

export enum LLMProvider {
	OPENAI = 'openai',
	ANTHROPIC = 'anthropic',
	LOCAL = 'local',
}

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
			/** Empty for relays that do not require authentication. */
			user: string;
			password: string;
			/** Default sender address. */
			from: string;
			fromName?: string;
			/** Implicit TLS (port 465). Defaults to true for port 465. */
			secure?: boolean;
			/** Fail if the server does not offer STARTTLS. */
			requireTLS?: boolean;
			/** Set to false to accept self-signed certificates. */
			rejectUnauthorized?: boolean;
			/**
			 * Always send from `from`. The sender address from the company
			 * settings becomes the Reply-To. For providers that only accept
			 * verified sender addresses.
			 */
			enforceFrom?: boolean;
	  };

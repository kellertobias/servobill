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
      user: string;
      password: string;
      from: string;
      fromName?: string;
    };

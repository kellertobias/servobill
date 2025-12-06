/**
 * @fileoverview Unit tests for ConfigService.
 *
 * All dependencies (process.env) are mocked. Tests cover all major config branches.
 * Uses Vitest (all functions imported explicitly).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ConfigService } from './config.service';
import {
	DatabaseType,
	EmailType,
	FileStorageType,
	LLMProvider,
} from './constants';

// Save original env to restore after tests
const ORIGINAL_ENV = { ...process.env };

/**
 * Helper to reset process.env to a clean state before each test.
 */
function resetEnv() {
	for (const key of Object.keys(process.env)) {
		delete process.env[key];
	}
	Object.assign(process.env, ORIGINAL_ENV);
}

describe('ConfigService', () => {
	beforeEach(() => {
		resetEnv();
	});

	afterEach(() => {
		resetEnv();
	});

	it('should use default config when no env vars are set', () => {
		// Remove all relevant env vars
		resetEnv();
		const config = new ConfigService();
		expect(config.port).toBe(3000);
		expect(config.region).toBe('eu-central-1');
		expect(config.domains.api).toBe('localhost:3000');
		expect(config.domains.site).toBe('localhost:3000');
		expect(config.endpoints.dynamodb).toBeUndefined();
		expect(config.tables.databaseType).toBe(DatabaseType.DYNAMODB);
		expect(config.llm).toBeNull();
		expect(config.isLocal).toBe(false);
		// Buckets, tables, and email configs will be undefined or throw if accessed
	});

	it('should set isLocal to true if IS_OFFLINE is "true"', () => {
		process.env.IS_OFFLINE = 'true';
		const config = new ConfigService();
		expect(config.isLocal).toBe(true);
	});

	it('should configure SMTP email if SMTP_HOST is set', () => {
		process.env.SMTP_HOST = 'smtp.example.com';
		process.env.SMTP_PORT = '2525';
		process.env.SMTP_USER = 'user';
		process.env.SMTP_PASSWORD = 'pass';
		process.env.SMTP_FROM = 'from@example.com';
		process.env.SMTP_FROM_NAME = 'Sender';
		const config = new ConfigService();
		// Type narrowing: Only access SMTP properties if type is SMTP
		expect(config.email.type).toBe(EmailType.SMTP);
		if (config.email.type === EmailType.SMTP) {
			expect(config.email.host).toBe('smtp.example.com');
			expect(config.email.port).toBe(2525);
			expect(config.email.user).toBe('user');
			expect(config.email.password).toBe('pass');
			expect(config.email.from).toBe('from@example.com');
			expect(config.email.fromName).toBe('Sender');
		}
	});

	it('should configure SES email if SMTP_HOST is not set', () => {
		process.env.SES_ACCESS_KEY_ID = 'AKIA...';
		process.env.SES_SECRET_ACCESS_KEY = 'SECRET...';
		const config = new ConfigService();
		// Type narrowing: Only access SES properties if type is SES
		expect(config.email.type).toBe(EmailType.SES);
		if (config.email.type === EmailType.SES) {
			expect(config.email.accessKeyId).toBe('AKIA...');
			expect(config.email.secretAccessKey).toBe('SECRET...');
		}
	});

	it('should configure fileStorage as LOCAL if UPLOAD_DIRECTORY is set', () => {
		process.env.UPLOAD_DIRECTORY = '/tmp/uploads';
		const config = new ConfigService();
		// Type narrowing: Only access baseDirectory if type is LOCAL
		expect(config.fileStorage.type).toBe(FileStorageType.LOCAL);
		if (config.fileStorage.type === FileStorageType.LOCAL) {
			expect(config.fileStorage.baseDirectory).toBe('/tmp/uploads');
		}
	});

	it('should configure fileStorage as S3 if UPLOAD_DIRECTORY is not set', () => {
		delete process.env.UPLOAD_DIRECTORY;
		const config = new ConfigService();
		expect(config.fileStorage.type).toBe(FileStorageType.S3);
	});

	it('should configure LLM if LLM_PROVIDER is set', () => {
		process.env.LLM_PROVIDER = LLMProvider.OPENAI;
		process.env.LLM_API_KEY = 'sk-...';
		process.env.LLM_BASE_URL = 'https://api.openai.com';
		process.env.LLM_MODEL = 'gpt-4';
		const config = new ConfigService();
		expect(config.llm).toBeTruthy();
		expect(config.llm?.provider).toBe(LLMProvider.OPENAI);
		expect(config.llm?.apiKey).toBe('sk-...');
		expect(config.llm?.baseUrl).toBe('https://api.openai.com');
		expect(config.llm?.model).toBe('gpt-4');
	});

	it('should use default LLM model if not set and provider is OPENAI', () => {
		process.env.LLM_PROVIDER = LLMProvider.OPENAI;
		process.env.LLM_API_KEY = 'sk-...';
		delete process.env.LLM_MODEL;
		const config = new ConfigService();
		expect(config.llm?.model).toBe('gpt-4.1');
	});

	it('should use default LLM model if not set and provider is not OPENAI', () => {
		process.env.LLM_PROVIDER = LLMProvider.ANTHROPIC;
		process.env.LLM_API_KEY = 'sk-...';
		delete process.env.LLM_MODEL;
		const config = new ConfigService();
		expect(config.llm?.model).toBe('claude-3-5-sonnet-20240620');
	});

	it('should set databaseType to SQLITE if SQLITE_PATH is set', () => {
		process.env.SQLITE_PATH = '/tmp/sqlite.db';
		const config = new ConfigService();
		expect(config.tables.databaseType).toBe(DatabaseType.SQLITE);
		expect(config.tables.sqlite).toBe('/tmp/sqlite.db');
	});

	it('should set databaseType to POSTGRES if POSTGRES_URL is set', () => {
		process.env.POSTGRES_URL = 'postgres://user:pass@host/db';
		delete process.env.SQLITE_PATH;
		const config = new ConfigService();
		expect(config.tables.databaseType).toBe(DatabaseType.POSTGRES);
		expect(config.tables.postgres).toBe('postgres://user:pass@host/db');
	});

	it('should set databaseType to DYNAMODB if neither SQLITE_PATH nor POSTGRES_URL is set', () => {
		delete process.env.SQLITE_PATH;
		delete process.env.POSTGRES_URL;
		const config = new ConfigService();
		expect(config.tables.databaseType).toBe(DatabaseType.DYNAMODB);
	});

	it('should expose uploadDirectory getter', () => {
		process.env.UPLOAD_DIRECTORY = '/tmp/uploads';
		const config = new ConfigService();
		expect(config.uploadDirectory).toBe('/tmp/uploads');
	});
});

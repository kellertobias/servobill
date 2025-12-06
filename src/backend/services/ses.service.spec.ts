/**
 * Unit tests for SESService.
 *
 * These tests mock all dependencies (nodemailer, AWS SES client, ConfigService, etc.)
 * to ensure SESService logic is tested in isolation. Both SES and SMTP branches
 * are covered, with and without attachments.
 *
 * Why: To verify that SESService correctly configures and uses nodemailer for both
 * SES and SMTP, and that attachments are handled as expected.
 */

import { SESv2Client } from '@aws-sdk/client-sesv2';
import type { SendMailOptions } from 'nodemailer';
import nodemailer from 'nodemailer';
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type MockInstance,
	vi,
} from 'vitest';
import { ConfigService } from './config.service';
import { DatabaseType, EmailType, FileStorageType } from './constants';
import { SESService } from './ses.service';

// Mock nodemailer and its createTransport function
vi.mock('nodemailer', () => {
	return {
		default: {
			createTransport: vi.fn(),
		},
		createTransport: vi.fn(),
	};
});

// Mock AWS SDK SESClient
vi.mock('@aws-sdk/client-sesv2', () => {
	return {
		SESv2Client: vi.fn(),
		SendEmailCommand: vi.fn(),
	};
});

/**
 * Minimal mock of ConfigService for testing SESService.
 *
 * This class allows us to override only the properties relevant to the test,
 * while providing all required properties to satisfy type checks.
 */
class MockConfigService extends ConfigService {
	constructor(partial: Partial<ConfigService>) {
		super();
		Object.assign(this, partial);
	}
}

// Helper: create a mock ConfigService for SES
function makeSESConfig(): ConfigService {
	return new MockConfigService({
		email: {
			type: EmailType.SES,
			accessKeyId: 'AKIA_TEST',
			secretAccessKey: 'SECRET_TEST',
		},
		endpoints: {
			ses: 'https://ses.test',
			s3: '',
			dynamodb: '',
			eventbridge: '',
		},
		region: 'us-east-1',
		// Provide required but unused properties with dummy values
		tables: {
			electordb: '',
			sqlite: '',
			postgres: '',
			databaseType: DatabaseType.DYNAMODB,
		},
		awsCreds: { accessKeyId: '', secretAccessKey: '' },
		llm: null,
		port: 0,
		domains: { api: '', site: '' },
		eventBusName: '',
		buckets: { files: '' },
		fileStorage: { type: FileStorageType.LOCAL, baseDirectory: '' },
	});
}

// Helper: create a mock ConfigService for SMTP
function makeSMTPConfig(): ConfigService {
	return new MockConfigService({
		email: {
			type: EmailType.SMTP,
			host: 'smtp.test',
			port: 587,
			user: 'user',
			password: 'pass',
			from: 'default@from.com',
			fromName: undefined,
		},
		endpoints: { ses: '', s3: '', dynamodb: '', eventbridge: '' },
		region: '',
		tables: {
			electordb: '',
			sqlite: '',
			postgres: '',
			databaseType: DatabaseType.DYNAMODB,
		},
		awsCreds: { accessKeyId: '', secretAccessKey: '' },
		llm: null,
		port: 0,
		domains: { api: '', site: '' },
		eventBusName: '',
		buckets: { files: '' },
		fileStorage: { type: FileStorageType.LOCAL, baseDirectory: '' },
	});
}

describe('SESService', () => {
	let sendMailMock: MockInstance;
	let createTransportMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		// sendMailMock simulates nodemailer's sendMail signature
		sendMailMock = vi.fn((opts, cb) =>
			cb(null, { accepted: [opts.to], ...opts }),
		);
		createTransportMock = vi.fn(() => ({ sendMail: sendMailMock }));
		(nodemailer.createTransport as unknown as typeof createTransportMock) =
			createTransportMock;
		(SESv2Client as unknown as { mockClear: () => void }).mockClear();
		createTransportMock.mockClear();
		sendMailMock.mockClear();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	/**
	 * Test: SMTP sending without attachments
	 */
	it('should send email via SMTP without attachments', async () => {
		const config = makeSMTPConfig();
		const service = new SESService(config);
		// Use type guard to access SMTP-specific properties
		const email = config.email;
		if (email.type !== EmailType.SMTP) {
			throw new Error('Expected SMTP config');
		}
		const result = await service.sendEmail({
			from: '', // should fallback to config.email.from
			to: 'to@example.com',
			subject: 'Test SMTP',
			html: '<b>Hello</b>',
		});
		// Should call nodemailer.createTransport with SMTP config
		expect(createTransportMock).toHaveBeenCalledWith({
			host: email.host,
			port: email.port,
			secure: false,
			auth: {
				user: email.user,
				pass: email.password,
			},
		});
		// Should call sendMail with correct params
		expect(sendMailMock).toHaveBeenCalledWith(
			expect.objectContaining({
				from: email.from,
				to: 'to@example.com',
				subject: 'Test SMTP',
				html: '<b>Hello</b>',
				attachments: undefined,
			}),
			expect.any(Function),
		);
		expect(result.accepted).toContain('to@example.com');
	});

	/**
	 * Test: SMTP sending with attachments
	 */
	it('should send email via SMTP with attachments', async () => {
		const config = makeSMTPConfig();
		const service = new SESService(config);
		const attachments = [
			{ filename: 'file.txt', content: Buffer.from('test') },
		];
		await service.sendEmail({
			from: '',
			to: 'to@example.com',
			subject: 'Test SMTP Attach',
			html: '<b>Hi</b>',
			attachments,
		});
		expect(sendMailMock).toHaveBeenCalledWith(
			expect.objectContaining({ attachments }),
			expect.any(Function),
		);
	});

	/**
	 * Test: SES sending without attachments
	 */
	it('should send email via SES without attachments', async () => {
		const config = makeSESConfig();
		const service = new SESService(config);
		// Use type guard to access SES-specific properties
		const email = config.email;
		if (email.type !== EmailType.SES) {
			throw new Error('Expected SES config');
		}
		await service.sendEmail({
			from: 'from@ses.com',
			to: 'to@ses.com',
			subject: 'SES Test',
			html: '<b>SES</b>',
		});
		// Should initialize SESClient
		expect(SESv2Client).toHaveBeenCalledWith(
			expect.objectContaining({
				endpoint: config.endpoints.ses,
				region: config.region,
				credentials: {
					accessKeyId: email.accessKeyId,
					secretAccessKey: email.secretAccessKey,
				},
			}),
		);
		expect(createTransportMock).toHaveBeenCalledWith(
			expect.objectContaining({
				SES: expect.objectContaining({
					sesClient: expect.any(Object),
					SendEmailCommand: expect.any(Function),
				}),
			}),
		);
		expect(sendMailMock).toHaveBeenCalledWith(
			expect.objectContaining({
				from: 'from@ses.com',
				to: 'to@ses.com',
				subject: 'SES Test',
				html: '<b>SES</b>',
				attachments: undefined,
			}),
			expect.any(Function),
		);
	});

	/**
	 * Test: SES sending with attachments
	 */
	it('should send email via SES with attachments', async () => {
		const config = makeSESConfig();
		const service = new SESService(config);
		const attachments = [{ filename: 'file.pdf', content: Buffer.from('pdf') }];
		await service.sendEmail({
			from: 'from@ses.com',
			to: 'to@ses.com',
			subject: 'SES Attach',
			html: '<b>SES</b>',
			attachments,
		});
		expect(sendMailMock).toHaveBeenCalledWith(
			expect.objectContaining({ attachments }),
			expect.any(Function),
		);
	});

	/**
	 * Test: sendMail error is propagated
	 */
	it('should reject if sendMail returns error', async () => {
		// Use vi.fn().mockImplementationOnce to simulate error
		sendMailMock.mockImplementationOnce(
			(
				_opts: SendMailOptions,
				cb: (err: Error | null, info?: unknown) => void,
			) => cb(new Error('fail')),
		);
		const config = makeSMTPConfig();
		const service = new SESService(config);
		await expect(
			service.sendEmail({
				from: '',
				to: 'fail@fail.com',
				subject: 'fail',
				html: 'fail',
			}),
		).rejects.toThrow('fail');
	});
});

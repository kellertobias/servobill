/* eslint-disable unicorn/no-useless-undefined */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unit tests for FileStorageServiceLocal and FileStorageServiceS3 using DI.
 *
 * - Uses App.forRoot for DI context per suite (see dependency-injection-for-tests rule).
 * - Registers config and dependencies in DI.
 * - Uses app.create(FileStorageServiceLocal/S3) to get the test subject.
 * - Mocks all external dependencies.
 * - Cleans up spies only if they exist.
 */

import * as fsMock from 'node:fs';
import * as fsPromisesMock from 'node:fs/promises';
import type { MockInstance } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AttachmentEntity } from '@/backend/entities/attachment.entity';
import type { ConfigService } from '@/backend/services/config.service';
import { FileStorageType } from '@/backend/services/constants';
import { CONFIG_SERVICE, S3_SERVICE } from '@/backend/services/di-tokens';
import type { S3Service } from '@/backend/services/s3.service';
import { App } from '@/common/di';
import { FileStorageServiceLocal } from './file-storage-local.service';
import { FileStorageServiceS3 } from './file-storage-s3.service';

// --- Mock fs/promises and fs globally to avoid spy issues with Node.js built-ins ---
vi.mock('node:fs/promises', () => ({
	readFile: vi.fn(),
	writeFile: vi.fn(),
	unlink: vi.fn(),
	mkdir: vi.fn(),
}));
vi.mock('node:fs', () => ({
	existsSync: vi.fn(),
}));

// Import the mocked modules for use in tests

// --- Helper: Minimal AttachmentEntity ---
const makeAttachment = (): AttachmentEntity => {
	// @ts-expect-error: AttachmentEntity may require constructor args in real codebase, but for test we use default
	const att = new AttachmentEntity();
	att.id = 'att-1';
	att.s3Bucket = 'mock-bucket';
	att.s3Key = 'mock-key';
	att.fileName = 'file.txt';
	return att;
};

// --- Helper: Minimal ConfigService stub ---
function makeConfig(type: FileStorageType): ConfigService {
	if (type === FileStorageType.S3) {
		// Provide all required properties for S3Service
		return {
			fileStorage: {
				type,
				baseDirectory: '/mock/base',
			},
			buckets: {
				files: 'mock-bucket',
			},
			endpoints: {
				s3: undefined,
				dynamodb: undefined,
				eventbridge: undefined,
				ses: undefined,
			},
			region: 'us-east-1',
			awsCreds: { accessKeyId: 'AKIA', secretAccessKey: 'SECRET' },
			isLocal: false,
			domains: { api: '', site: '' },
			eventBusName: '',
			tables: {
				electordb: undefined,
				sqlite: undefined,
				postgres: undefined,
				databaseType: undefined,
			},
			llm: null,
			port: 0,
			email: {} as any,
		} as unknown as ConfigService;
	}
	return {
		fileStorage: {
			type,
			baseDirectory: '/mock/base',
		},
		buckets: {
			files: 'mock-bucket',
		},
		// Only required properties for test
	} as ConfigService;
}

// Helper to cast a function to a MockInstance for type-safe mocking
function asMock<T extends (...args: any[]) => any>(fn: T): MockInstance {
	return fn as unknown as MockInstance;
}

describe('FileStorageServiceLocal', () => {
	let service: FileStorageServiceLocal;
	let app: ReturnType<typeof App.forRoot>;
	let fsPromises: ReturnType<typeof vi.mocked<typeof fsPromisesMock>>;
	let fs: ReturnType<typeof vi.mocked<typeof fsMock>>;

	beforeEach(() => {
		// Setup DI context
		const config = makeConfig(FileStorageType.LOCAL);
		app = App.forRoot({
			modules: [
				{ token: CONFIG_SERVICE, value: config },
				FileStorageServiceLocal,
			],
		});
		service = app.create(FileStorageServiceLocal);
		// Get mocked versions
		fsPromises = vi.mocked(fsPromisesMock);
		fs = vi.mocked(fsMock);
		// Reset all fs mocks for clean state
		fsPromises.readFile.mockReset();
		fsPromises.writeFile.mockReset();
		fsPromises.unlink.mockReset();
		fsPromises.mkdir.mockReset();
		fs.existsSync.mockReset();
	});

	it('should read a file (getFile)', async () => {
		fsPromises.readFile.mockResolvedValue(Buffer.from('data'));
		const result = await service.getFile('key.txt');
		expect(fsPromises.readFile).toHaveBeenCalled();
		expect(result).toEqual(Buffer.from('data'));
	});

	it('should save a file (saveFile)', async () => {
		fs.existsSync.mockReturnValue(false);
		fsPromises.mkdir.mockResolvedValue(undefined);
		fsPromises.writeFile.mockResolvedValue(undefined);
		const url = await service.saveFile('key.txt', Buffer.from('abc'));
		expect(fsPromises.mkdir).toHaveBeenCalled();
		expect(fsPromises.writeFile).toHaveBeenCalled();
		expect(url).toContain('/api/download');
	});

	it('should delete a file (deleteFile)', async () => {
		fsPromises.unlink.mockResolvedValue();
		await service.deleteFile('key.txt');
		expect(fsPromises.unlink).toHaveBeenCalled();
	});

	it('should get upload url (getUploadUrl)', async () => {
		const att = makeAttachment();
		const url = await service.getUploadUrl(att);
		expect(url).toContain('/api/upload');
	});

	it('should get download url (getDownloadUrl)', async () => {
		const att = makeAttachment();
		const url = await service.getDownloadUrl(att);
		expect(url).toContain('/api/download');
	});

	it('should parse file descriptor from url (getFileDescriptor)', () => {
		const url = 'https://bucket/key.txt';
		const desc = service.getFileDescriptor(url);
		expect(desc).toEqual({ bucket: 'bucket', key: 'key.txt' });
	});
});

describe('FileStorageServiceS3', () => {
	let service: FileStorageServiceS3;
	let app: ReturnType<typeof App.forRoot>;
	let s3: S3Service;

	beforeEach(() => {
		// --- IMPORTANT: Use a plain object for the S3Service mock with vi.fn() for each method ---
		// This avoids issues with vi.mocked and type casting, and ensures DI uses the correct mock instance.
		s3 = {
			getObject: vi.fn(),
			putObject: vi.fn(),
			deleteObject: vi.fn(),
			getSignedUploadUrl: vi.fn(),
			getSignedUrl: vi.fn(),
		} as unknown as S3Service;
		app = App.forRoot({
			modules: [
				{ token: CONFIG_SERVICE, value: makeConfig(FileStorageType.S3) },
				{ token: S3_SERVICE, value: s3 },
			],
		});
		service = app.create(FileStorageServiceS3);
		// Reset all S3 mocks for clean state
		asMock(s3.getObject).mockReset();
		asMock(s3.putObject).mockReset();
		asMock(s3.deleteObject).mockReset();
		asMock(s3.getSignedUploadUrl).mockReset();
		asMock(s3.getSignedUrl).mockReset();
	});

	it('should get a file (getFile)', async () => {
		const chunks = [Buffer.from('a'), Buffer.from('b')];
		asMock(s3.getObject).mockResolvedValue({
			[Symbol.asyncIterator]: async function* () {
				yield* chunks;
			},
		} as any);
		const result = await service.getFile('key.txt');
		expect(s3.getObject).toHaveBeenCalled();
		expect(result).toEqual(
			Buffer.concat(chunks as unknown as readonly (Uint8Array & Buffer)[]),
		);
	});

	it('should throw if file not found (getFile)', async () => {
		asMock(s3.getObject).mockResolvedValue(undefined);
		await expect(service.getFile('key.txt')).rejects.toThrow(
			'File not found in S3',
		);
	});

	it('should save a file (saveFile)', async () => {
		asMock(s3.putObject).mockResolvedValue('url');
		const url = await service.saveFile('key.txt', Buffer.from('abc'));
		expect(s3.putObject).toHaveBeenCalled();
		expect(url).toBe('url');
	});

	it('should delete a file (deleteFile)', async () => {
		asMock(s3.deleteObject).mockResolvedValue(undefined);
		await service.deleteFile('key.txt');
		expect(s3.deleteObject).toHaveBeenCalled();
	});

	it('should get upload url (getUploadUrl)', async () => {
		asMock(s3.getSignedUploadUrl).mockResolvedValue('signed-url');
		const att = makeAttachment();
		// --- Bypass DI for this test: instantiate directly to ensure correct mock usage ---
		const directService = new FileStorageServiceS3(
			makeConfig(FileStorageType.S3),
			s3,
		);
		const url = await directService.getUploadUrl(att);
		expect(s3.getSignedUploadUrl).toHaveBeenCalled();
		expect(url).toBe('signed-url');
	});

	it('should get download url (getDownloadUrl)', async () => {
		asMock(s3.getSignedUrl).mockResolvedValue('signed-url');
		const att = makeAttachment();
		// --- Bypass DI for this test: instantiate directly to ensure correct mock usage ---
		const directService = new FileStorageServiceS3(
			makeConfig(FileStorageType.S3),
			s3,
		);
		const url = await directService.getDownloadUrl(att);
		expect(s3.getSignedUrl).toHaveBeenCalled();
		expect(url).toBe('signed-url');
	});

	it('should parse file descriptor from url (getFileDescriptor)', () => {
		const url = 'https://bucket.s3.amazonaws.com/key.txt';
		const desc = service.getFileDescriptor(url);
		expect(desc).toEqual({ bucket: 'bucket', key: 'key.txt' });
	});
});

import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type MockInstance,
	vi,
} from 'vitest';
import type { ConfigService } from './config.service';
import { S3Service } from './s3.service';

// Mock AWS SDK S3 client and presigner
vi.mock('@aws-sdk/client-s3', async () => {
	return {
		S3Client: vi.fn().mockImplementation(() => ({ send: vi.fn() })),
		GetObjectCommand: vi.fn(),
		PutObjectCommand: vi.fn(),
		DeleteObjectCommand: vi.fn(),
	};
});
vi.mock('@aws-sdk/s3-request-presigner', async () => ({
	getSignedUrl: vi.fn(),
}));

/**
 * Creates a mock ConfigService with minimal required properties for S3Service.
 * The cast to 'unknown as ConfigService' is used to satisfy the type checker for the test context.
 */
function createMockConfigService(): ConfigService {
	return {
		endpoints: {},
		isLocal: false,
		region: 'us-east-1',
		awsCreds: { accessKeyId: 'AKIA', secretAccessKey: 'SECRET' },
		buckets: { files: 'test-bucket' },
	} as unknown as ConfigService;
}

describe('S3Service', () => {
	let service: S3Service;
	let config: ConfigService;
	// Use Record<string, unknown> for the mock S3 client instance
	let s3ClientInstance: Record<string, unknown>;

	beforeEach(() => {
		// Reset all mocks before each test
		vi.clearAllMocks();
		config = createMockConfigService();
		// S3Client mock instance
		s3ClientInstance = { send: vi.fn() };
		(S3Client as unknown as MockInstance).mockImplementation(
			() => s3ClientInstance,
		);
		service = new S3Service(config);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	/**
	 * Test getSignedUploadUrl returns a signed URL from the presigner.
	 */
	it('getSignedUploadUrl returns a signed URL', async () => {
		(getSignedUrl as unknown as MockInstance).mockResolvedValue(
			'https://signed-upload-url',
		);
		(PutObjectCommand as unknown as MockInstance).mockImplementation(
			(input: unknown) => input,
		);
		const url = await service.getSignedUploadUrl({ key: 'file.txt' });
		expect(PutObjectCommand).toHaveBeenCalledWith({
			Bucket: 'test-bucket',
			Key: 'file.txt',
		});
		expect(getSignedUrl).toHaveBeenCalled();
		expect(url).toBe('https://signed-upload-url');
	});

	/**
	 * Test getSignedUrl returns a signed download URL from the presigner.
	 */
	it('getSignedUrl returns a signed download URL', async () => {
		(getSignedUrl as unknown as MockInstance).mockResolvedValue(
			'https://signed-download-url',
		);
		(GetObjectCommand as unknown as MockInstance).mockImplementation(
			(input: unknown) => input,
		);
		const url = await service.getSignedUrl({
			key: 'file.txt',
			contentDisposition: 'attachment',
		});
		expect(GetObjectCommand).toHaveBeenCalledWith({
			Bucket: 'test-bucket',
			Key: 'file.txt',
			ResponseContentDisposition: 'attachment',
		});
		expect(getSignedUrl).toHaveBeenCalled();
		expect(url).toBe('https://signed-download-url');
	});

	/**
	 * Test deleteObject calls the S3 client's send method with DeleteObjectCommand.
	 */
	it('deleteObject calls S3 client with DeleteObjectCommand', async () => {
		(DeleteObjectCommand as unknown as MockInstance).mockImplementation(
			(input: unknown) => input,
		);
		(s3ClientInstance.send as MockInstance).mockResolvedValue({});
		await service.deleteObject({ key: 'file.txt' });
		expect(DeleteObjectCommand).toHaveBeenCalledWith({
			Bucket: 'test-bucket',
			Key: 'file.txt',
		});
		expect(s3ClientInstance.send).toHaveBeenCalled();
	});

	/**
	 * Test getObject returns the response body from S3 client.
	 */
	it('getObject returns the response body', async () => {
		(GetObjectCommand as unknown as MockInstance).mockImplementation(
			(input: unknown) => input,
		);
		const mockBody = Buffer.from('file-content');
		(s3ClientInstance.send as MockInstance).mockResolvedValue({
			Body: mockBody,
		});
		const result = await service.getObject({ key: 'file.txt' });
		expect(GetObjectCommand).toHaveBeenCalledWith({
			Bucket: 'test-bucket',
			Key: 'file.txt',
		});
		expect(s3ClientInstance.send).toHaveBeenCalled();
		expect(result).toBe(mockBody);
	});

	/**
		(GetObjectCommand as unknown as MockInstance).mockImplementation(
			(input: unknown) => input,
		);
		const mockBody = Buffer.from('file-content');
		(s3ClientInstance.send as MockInstance).mockResolvedValue({
			Body: mockBody,
		});
		const result = await service.getObject({ key: 'file.txt' });
		(GetObjectCommand as unknown as MockInstance).mockImplementation(
			(input: unknown) => input,
		);
		const mockBody = Buffer.from('file-content');
		(s3ClientInstance.send as MockInstance).mockResolvedValue({
			Body: mockBody,
		});
		const result = await service.getObject({ key: 'file.txt' });
		expect(GetObjectCommand).toHaveBeenCalledWith({
			Bucket: 'test-bucket',
			Key: 'file.txt',
		});
		expect(s3ClientInstance.send).toHaveBeenCalled();
		expect(result).toBe(mockBody);
	});

	/**
	 * Test putObject uploads the object and returns the resource URL.
	 */
	it('putObject uploads and returns resource URL', async () => {
		(PutObjectCommand as unknown as MockInstance).mockImplementation(
			(input: unknown) => input,
		);
		(s3ClientInstance.send as MockInstance).mockResolvedValue({});
		(getSignedUrl as unknown as MockInstance).mockResolvedValue(
			'https://bucket.s3/file.txt?sig=abc',
		);
		const resource = await service.putObject({
			key: 'file.txt',
			body: 'data',
			public: true,
		});
		expect(PutObjectCommand).toHaveBeenCalled();
		expect(s3ClientInstance.send).toHaveBeenCalled();
		// Should return the URL without query params
		expect(resource).toBe('https://bucket.s3/file.txt');
	});
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/common/di';
import type { ConfigService } from './config.service';
import { CONFIG_SERVICE, EVENTBUS_SERVICE } from './di-tokens';
import { EventBusService } from './eventbus.service';

// Local type for fake span context
interface FakeSpan {
	spanContext: () => { traceId?: string; spanId?: string };
}

// Local types for test-only mocks
interface EventBridgeMockModule {
	mocks: { mockSend: ReturnType<typeof vi.fn> };
}
interface LoggerMockModule {
	mocks: { mockLoggerInfo: ReturnType<typeof vi.fn> };
}
interface OtelMockModule {
	mocks: {
		mockStartActiveSpan: ReturnType<typeof vi.fn>;
		mockInject: ReturnType<typeof vi.fn>;
	};
}

// Mock ConfigService
const mockConfigService = {
	endpoints: { eventbridge: 'http://localhost:4566' },
	region: 'us-east-1',
	awsCreds: {
		accessKeyId: 'test',
		secretAccessKey: 'test',
	},
	eventBusName: 'test-bus',
} as unknown as ConfigService;

// Mock EventBridgeClient
vi.mock('@aws-sdk/client-eventbridge', () => {
	const mockSend = vi.fn();
	return {
		EventBridgeClient: vi.fn().mockImplementation(() => ({ send: mockSend })),
		PutEventsCommand: vi.fn().mockImplementation((input) => input),
		mocks: { mockSend },
	};
});

// Mock OpenTelemetry
vi.mock('@opentelemetry/api', () => {
	const mockStartActiveSpan = vi.fn();
	const mockInject = vi.fn();
	return {
		trace: {
			getTracer: vi.fn().mockReturnValue({
				startActiveSpan: mockStartActiveSpan,
			}),
		},
		context: {
			active: vi.fn(),
		},
		propagation: {
			inject: mockInject,
		},
		mocks: { mockStartActiveSpan, mockInject },
	};
});

// Mock Logger
vi.mock('./logger.service', () => {
	const mockLoggerInfo = vi.fn();
	return {
		Logger: vi.fn().mockImplementation(() => ({
			info: mockLoggerInfo,
		})),
		mocks: { mockLoggerInfo },
	};
});

// Mock CustomJson
vi.mock('@/common/json', () => ({
	CustomJson: {
		toJson: vi.fn((x) => JSON.stringify(x)),
	},
}));

/**
 * Unit tests for EventBusService
 *
 * All dependencies are mocked to ensure isolation. This test verifies:
 * - The send method calls AWS SDK with correct parameters
 * - Logger is called as expected
 * - Tracing logic is invoked
 * - The return value is as expected
 *
 * Uses DI context per project rules.
 */
describe('EventBusService', () => {
	let service: EventBusService;
	let mockSend: ReturnType<typeof vi.fn>;
	let mockLoggerInfo: ReturnType<typeof vi.fn>;
	let mockStartActiveSpan: ReturnType<typeof vi.fn>;
	let mockInject: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.clearAllMocks();
		// Set up DI context and register mocks/config
		const app = App.forRoot({
			modules: [
				{ token: CONFIG_SERVICE, value: mockConfigService },
				{ token: EVENTBUS_SERVICE, module: EventBusService },
			],
		});
		service = app.create(EventBusService);
		// Dynamically import mocks after DI setup, cast to local types
		mockSend = (
			(await import(
				'@aws-sdk/client-eventbridge'
			)) as unknown as EventBridgeMockModule
		).mocks.mockSend;
		mockLoggerInfo = (
			(await import('./logger.service')) as unknown as LoggerMockModule
		).mocks.mockLoggerInfo;
		const otel = (await import(
			'@opentelemetry/api'
		)) as unknown as OtelMockModule;
		mockStartActiveSpan = otel.mocks.mockStartActiveSpan;
		mockInject = otel.mocks.mockInject;
	});

	it('should construct with the provided config', () => {
		expect(service).toBeInstanceOf(EventBusService);
	});

	it('should send an event and return the EventId', async () => {
		// Arrange: mock the AWS SDK response and tracing
		const fakeEventId = '1234-5678';
		mockSend.mockResolvedValueOnce({ Entries: [{ EventId: fakeEventId }] });
		// Mock span context
		const fakeSpan: FakeSpan = {
			spanContext: () => ({ traceId: 'trace-id', spanId: 'span-id' }),
		};
		// Mock startActiveSpan to call the callback with fakeSpan
		mockStartActiveSpan.mockImplementation(
			(_name: string, cb: (span: FakeSpan) => unknown) => cb(fakeSpan),
		);

		// Act
		const result = await service.send(
			'TestType',
			{ foo: 'bar' },
			{
				source: 'test-source',
				resources: ['res1'],
			},
		);

		// Assert
		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				Entries: [
					expect.objectContaining({
						EventBusName: 'test-bus',
						DetailType: 'TestType',
						Source: 'test-source',
						Resources: ['res1'],
						Detail: expect.stringContaining('foo'),
					}),
				],
			}),
		);
		expect(mockLoggerInfo).toHaveBeenCalledWith(
			'Sending event',
			expect.any(Object),
		);
		expect(mockLoggerInfo).toHaveBeenCalledWith(
			'Event Sent',
			expect.any(Object),
		);
		expect(mockInject).toHaveBeenCalled();
		expect(result).toBe(fakeEventId);
	});

	it('should return undefined if no EventId is present', async () => {
		mockSend.mockResolvedValueOnce({ Entries: [{}] });
		const emptySpan: FakeSpan = { spanContext: () => ({}) };
		mockStartActiveSpan.mockImplementation(
			(_name: string, cb: (span: FakeSpan) => unknown) => cb(emptySpan),
		);
		const result = await service.send('Type', {});
		expect(result).toBeUndefined();
	});
});

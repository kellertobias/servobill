/**
 * @file llm.service.spec.ts
 * @description Unit tests for LLMService. All dependencies (ConfigService, Logger, OpenAI, fetch) are mocked.
 * Tests cover sendRequest for openai, anthropic, and local providers, as well as error handling.
 * Uses Vitest for testing.
 */

import {
	describe,
	it,
	expect,
	vi,
	beforeEach,
	afterEach,
	type Mock,
} from 'vitest';

import { LLMService, LLMConfig, LLMRequest } from './llm.service';
import type { ConfigService } from './config.service';

// Mock Logger to avoid real logging
vi.mock('./logger.service', () => ({
	Logger: vi.fn().mockImplementation(() => ({
		info: vi.fn(),
		error: vi.fn(),
	})),
}));

// Mock OpenAI SDK
const mockCreate = vi.fn();
const mockFilesCreate = vi.fn();
vi.mock('openai', () => ({
	default: vi.fn().mockImplementation(() => ({
		chat: {
			completions: {
				create: mockCreate,
			},
		},
		files: {
			create: mockFilesCreate,
		},
	})),
	APIError: class extends Error {
		status: number;
		name: string;
		constructor(message: string) {
			super(message);
			this.status = 400;
			this.name = 'APIError';
		}
	},
}));

// Mock ConfigService
class MockConfigService {
	llm: LLMConfig;
	constructor(config: LLMConfig) {
		this.llm = config;
	}
}

// Helper: create a basic LLMRequest
const baseRequest: LLMRequest = {
	prompt: 'Hello, world!',
};

// Save and restore global fetch
const originalFetch = global.fetch;

/**
 * Tests for LLMService
 */
describe('LLMService', () => {
	afterEach(() => {
		vi.clearAllMocks();
		global.fetch = originalFetch;
	});

	describe('OpenAI provider', () => {
		it('should send a request and return a response', async () => {
			// Arrange: mock OpenAI chat completion
			mockCreate.mockResolvedValueOnce({
				choices: [{ message: { content: 'OpenAI response' } }],
				usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
			});
			const config: LLMConfig = {
				provider: 'openai',
				apiKey: 'test-key',
				model: 'gpt-4',
			};
			// Type assertion is safe: LLMService only accesses .llm
			const service = new LLMService(
				new MockConfigService(config) as unknown as ConfigService,
			);

			// Act
			const result = await service.sendRequest(baseRequest);

			// Assert
			expect(result).toEqual({
				content: 'OpenAI response',
				usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
			});
			expect(mockCreate).toHaveBeenCalled();
		});

		it('should throw if API key is missing', async () => {
			const config: LLMConfig = {
				provider: 'openai',
				model: 'gpt-4',
			};
			const service = new LLMService(
				new MockConfigService(config) as unknown as ConfigService,
			);
			await expect(service.sendRequest(baseRequest)).rejects.toThrow(
				'OpenAI API key not configured',
			);
		});
	});

	describe('Anthropic provider', () => {
		beforeEach(() => {
			global.fetch = vi.fn();
		});

		it('should send a request and return a response', async () => {
			// Arrange: mock fetch response
			// Type assertion: Mock is the correct type for fetch mock
			(global.fetch as Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					content: [{ text: 'Anthropic response' }],
					usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 },
				}),
			});
			const config: LLMConfig = {
				provider: 'anthropic',
				apiKey: 'anthropic-key',
				model: 'claude-3-opus-20240229',
			};
			const service = new LLMService(
				new MockConfigService(config) as unknown as ConfigService,
			);

			// Act
			const result = await service.sendRequest(baseRequest);

			// Assert
			expect(result).toEqual({
				content: 'Anthropic response',
				usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 },
			});
			expect(global.fetch).toHaveBeenCalled();
		});

		it('should throw if API key is missing', async () => {
			const config: LLMConfig = {
				provider: 'anthropic',
				model: 'claude-3-opus-20240229',
			};
			const service = new LLMService(
				new MockConfigService(config) as unknown as ConfigService,
			);
			await expect(service.sendRequest(baseRequest)).rejects.toThrow(
				'Anthropic API key not configured',
			);
		});
	});

	describe('Local provider', () => {
		beforeEach(() => {
			global.fetch = vi.fn();
		});

		it('should send a request and return a response', async () => {
			// Arrange: mock fetch response
			(global.fetch as Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					choices: [{ message: { content: 'Local response' } }],
					usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 },
				}),
			});
			const config: LLMConfig = {
				provider: 'local',
				baseUrl: 'http://localhost:1234',
				model: 'local-model',
			};
			const service = new LLMService(
				new MockConfigService(config) as unknown as ConfigService,
			);

			// Act
			const result = await service.sendRequest(baseRequest);

			// Assert
			expect(result).toEqual({
				content: 'Local response',
				usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 },
			});
			expect(global.fetch).toHaveBeenCalled();
		});

		it('should throw if baseUrl is missing', async () => {
			const config: LLMConfig = {
				provider: 'local',
				model: 'local-model',
			};
			const service = new LLMService(
				new MockConfigService(config) as unknown as ConfigService,
			);
			await expect(service.sendRequest(baseRequest)).rejects.toThrow(
				'Local LLM base URL not configured',
			);
		});
	});

	describe('updateConfig', () => {
		it('should update the config', () => {
			const config: LLMConfig = {
				provider: 'openai',
				apiKey: 'test-key',
				model: 'gpt-4',
			};
			const service = new LLMService(
				new MockConfigService(config) as unknown as ConfigService,
			);
			service.updateConfig({
				provider: 'local',
				baseUrl: 'http://localhost:1234',
			});
			// @ts-expect-error: access private for test
			expect(service.config.provider).toBe('local');
			// @ts-expect-error: access private for test
			expect(service.config.baseUrl).toBe('http://localhost:1234');
		});
	});

	describe('constructor', () => {
		it('should throw if configService.llm is missing', () => {
			class BadConfigService {}
			expect(
				() =>
					new LLMService(new BadConfigService() as unknown as ConfigService),
			).toThrow('LLM configuration not found');
		});
	});
});

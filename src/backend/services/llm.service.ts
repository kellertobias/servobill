import { Logger } from './logger.service';
import { LLM_SERVICE } from './di-tokens';

import { Service } from '@/common/di';

/**
 * Configuration for LLM providers
 */
export interface LLMConfig {
	provider: 'openai' | 'anthropic' | 'local';
	apiKey?: string;
	baseUrl?: string;
	model?: string;
}

/**
 * Request structure for LLM calls
 */
export interface LLMRequest {
	prompt: string;
	files?: Array<{
		name: string;
		content: Buffer;
		mimeType: string;
	}>;
	temperature?: number;
	maxTokens?: number;
}

/**
 * Response structure from LLM calls
 */
export interface LLMResponse {
	content: string;
	usage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
}

/**
 * OpenAI message content types
 */
interface OpenAIMessageContent {
	type: 'text' | 'image_url';
	text?: string;
	image_url?: {
		url: string;
	};
}

/**
 * Anthropic message content types
 */
interface AnthropicMessageContent {
	type: 'text' | 'image';
	text?: string;
	source?: {
		type: 'base64';
		media_type: string;
		data: string;
	};
}

/**
 * Service for interfacing with Large Language Models
 * Supports OpenAI, Anthropic, and local LLM providers through OpenAPI-compatible interfaces
 */
@Service(LLM_SERVICE)
export class LLMService {
	private readonly logger = new Logger('LLMService');
	private config: LLMConfig;

	constructor() {
		// Default configuration - can be overridden via environment variables
		this.config = {
			provider:
				(process.env.LLM_PROVIDER as 'openai' | 'anthropic' | 'local') ||
				'openai',
			apiKey: process.env.LLM_API_KEY,
			baseUrl: process.env.LLM_BASE_URL,
			model: process.env.LLM_MODEL || 'gpt-4o',
		};
	}

	/**
	 * Update the LLM configuration
	 */
	public updateConfig(config: Partial<LLMConfig>): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * Send a request to the configured LLM provider
	 */
	public async sendRequest(request: LLMRequest): Promise<LLMResponse> {
		this.logger.info('Sending LLM request', {
			provider: this.config.provider,
			model: this.config.model,
			hasFiles: !!request.files?.length,
		});

		switch (this.config.provider) {
			case 'openai': {
				return this.sendOpenAIRequest(request);
			}
			case 'anthropic': {
				return this.sendAnthropicRequest(request);
			}
			case 'local': {
				return this.sendLocalRequest(request);
			}
			default: {
				throw new Error(`Unsupported LLM provider: ${this.config.provider}`);
			}
		}
	}

	/**
	 * Send request to OpenAI API
	 */
	private async sendOpenAIRequest(request: LLMRequest): Promise<LLMResponse> {
		if (!this.config.apiKey) {
			throw new Error('OpenAI API key not configured');
		}

		const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1';
		const url = `${baseUrl}/chat/completions`;

		const messages: Array<{
			role: 'user';
			content: OpenAIMessageContent[];
		}> = [
			{
				role: 'user',
				content: [
					{
						type: 'text',
						text: request.prompt,
					},
					...(request.files?.map((file) => ({
						type: 'image_url' as const,
						image_url: {
							url: `data:${file.mimeType};base64,${file.content.toString(
								'base64',
							)}`,
						},
					})) || []),
				],
			},
		];

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.config.apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: this.config.model,
				messages,
				temperature: request.temperature || 0.1,
				max_tokens: request.maxTokens || 4000,
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			this.logger.error('OpenAI API request failed', {
				status: response.status,
				statusText: response.statusText,
				error: errorText,
			});
			throw new Error(
				`OpenAI API request failed: ${response.status} ${response.statusText}`,
			);
		}

		const data = await response.json();
		return {
			content: data.choices[0].message.content,
			usage: data.usage,
		};
	}

	/**
	 * Send request to Anthropic API
	 */
	private async sendAnthropicRequest(
		request: LLMRequest,
	): Promise<LLMResponse> {
		if (!this.config.apiKey) {
			throw new Error('Anthropic API key not configured');
		}

		const baseUrl = this.config.baseUrl || 'https://api.anthropic.com';
		const url = `${baseUrl}/v1/messages`;

		const content: AnthropicMessageContent[] = [
			{
				type: 'text',
				text: request.prompt,
			},
			...(request.files?.map((file) => ({
				type: 'image' as const,
				source: {
					type: 'base64' as const,
					media_type: file.mimeType,
					data: file.content.toString('base64'),
				},
			})) || []),
		];

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'x-api-key': this.config.apiKey,
				'anthropic-version': '2023-06-01',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: this.config.model || 'claude-3-opus-20240229',
				max_tokens: request.maxTokens || 4000,
				temperature: request.temperature || 0.1,
				messages: [
					{
						role: 'user',
						content,
					},
				],
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			this.logger.error('Anthropic API request failed', {
				status: response.status,
				statusText: response.statusText,
				error: errorText,
			});
			throw new Error(
				`Anthropic API request failed: ${response.status} ${response.statusText}`,
			);
		}

		const data = await response.json();
		return {
			content: data.content[0].text,
			usage: data.usage,
		};
	}

	/**
	 * Send request to local LLM (OpenAPI-compatible)
	 */
	private async sendLocalRequest(request: LLMRequest): Promise<LLMResponse> {
		if (!this.config.baseUrl) {
			throw new Error('Local LLM base URL not configured');
		}

		const url = `${this.config.baseUrl}/v1/chat/completions`;

		const messages: Array<{
			role: 'user';
			content: OpenAIMessageContent[];
		}> = [
			{
				role: 'user',
				content: [
					{
						type: 'text',
						text: request.prompt,
					},
					...(request.files?.map((file) => ({
						type: 'image_url' as const,
						image_url: {
							url: `data:${file.mimeType};base64,${file.content.toString(
								'base64',
							)}`,
						},
					})) || []),
				],
			},
		];

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		if (this.config.apiKey) {
			headers['Authorization'] = `Bearer ${this.config.apiKey}`;
		}

		const response = await fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				model: this.config.model || 'local-model',
				messages,
				temperature: request.temperature || 0.1,
				max_tokens: request.maxTokens || 4000,
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			this.logger.error('Local LLM API request failed', {
				status: response.status,
				statusText: response.statusText,
				error: errorText,
			});
			throw new Error(
				`Local LLM API request failed: ${response.status} ${response.statusText}`,
			);
		}

		const data = await response.json();
		return {
			content: data.choices[0].message.content,
			usage: data.usage,
		};
	}
}

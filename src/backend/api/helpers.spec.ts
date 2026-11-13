import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { afterEach, describe, expect, it } from 'vitest';
import { getSiteUrl } from './helpers';

const event = (headers: Record<string, string>) =>
	({ headers }) as unknown as APIGatewayProxyEventV2;

describe('getSiteUrl', () => {
	afterEach(() => {
		delete process.env.PUBLIC_URL;
	});

	it('uses https and the api subdomain for serverless hosts', () => {
		expect(
			getSiteUrl(event({ host: 'api.billing.example.com' })),
		).toMatchObject({
			siteUrl: 'https://billing.example.com',
			url: 'https://api.billing.example.com',
		});
	});

	it('uses http for localhost', () => {
		expect(getSiteUrl(event({ host: 'localhost:3000' })).url).toBe(
			'http://localhost:3000',
		);
	});

	it('honours X-Forwarded-Proto', () => {
		expect(
			getSiteUrl(
				event({ host: '192.168.1.5:3000', 'x-forwarded-proto': 'http' }),
			).url,
		).toBe('http://192.168.1.5:3000');
	});

	it('prefers PUBLIC_URL', () => {
		process.env.PUBLIC_URL = 'http://nas.local:3000/';
		expect(getSiteUrl(event({ host: 'ignored' }))).toMatchObject({
			siteUrl: 'http://nas.local:3000',
			url: 'http://nas.local:3000',
			protocol: 'http',
		});
	});
});

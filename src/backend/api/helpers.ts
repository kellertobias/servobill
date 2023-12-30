import querystring from 'node:querystring';

import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import * as multipart from 'parse-multipart-data';

export const getSiteUrl = (evt: Parameters<APIGatewayProxyHandlerV2>[0]) => {
	const host = evt.headers['Host'] || evt.headers['host'];
	const protocol = host?.includes('localhost') ? 'http' : 'https';

	const siteHost = host?.replace('api.', '');
	const apiHost = host?.includes('localhost')
		? 'localhost:3000'
		: 'api.' + siteHost;

	return {
		host,
		protocol,
		apiUrl: `${protocol}://${apiHost}`,
		siteUrl: `${protocol}://${siteHost}`,
		url: `${protocol}://${host}`,
	};
};

export const getBody = (evt: Parameters<APIGatewayProxyHandlerV2>[0]) => {
	if (!evt.body) {
		return null;
	}

	const contentType =
		evt.headers['Content-Type'] || evt.headers['content-type'];

	switch (contentType) {
		case 'text/plain': {
			return evt.isBase64Encoded
				? Buffer.from(evt.body!, 'base64').toString()
				: evt.body;
		}
		case 'application/json': {
			return JSON.parse(
				evt.isBase64Encoded
					? Buffer.from(evt.body!, 'base64').toString()
					: evt.body,
			);
		}
		case 'application/x-www-form-urlencoded': {
			return querystring.parse(
				evt.isBase64Encoded
					? Buffer.from(evt.body!, 'base64').toString()
					: evt.body,
			);
		}
	}

	if (contentType?.includes('multipart/form-data')) {
		const boundary = contentType.split('boundary=')[1];
		return multipart.parse(
			evt.isBase64Encoded
				? Buffer.from(evt.body!, 'base64')
				: Buffer.from(evt.body),
			boundary,
		);
	}

	const bodyRaw = evt.isBase64Encoded
		? Buffer.from(evt.body!, 'base64').toString()
		: evt.body;

	// First try to parse as JSON
	try {
		return JSON.parse(bodyRaw);
	} catch {
		// Then try to parse as URLSearchParams
		try {
			return querystring.parse(bodyRaw);
		} catch {
			// Otherwise return the raw body
			return bodyRaw;
		}
	}
};

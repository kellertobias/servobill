import fs from 'node:fs';
import path from 'node:path';
import type { HttpVerb } from '@/common/api-types';
import { findFiles, handleFile } from './helpers';

export type ApiEndpoint = {
	method: HttpVerb;
	layers?: string[];
	pathSegments: string[];
	path: string;
	file: string;
	handler: string;
	eventType?: undefined;
};

const sortApiEndpoints = (apiEndpoints: ApiEndpoint[]) => {
	apiEndpoints
		.sort((a, b) => {
			// Compare each path segment.
			// If the segments are equal, compare the next segment.
			// If one segment contains a parameter, it is considered greater than the other.
			// If both segments contain a parameter, compare them by name.
			const aSegments = a.pathSegments;
			const bSegments = b.pathSegments;
			for (let i = 0; i < Math.max(aSegments.length, bSegments.length); i++) {
				const aSegment = aSegments[i];
				const bSegment = bSegments[i];

				if (aSegment === undefined) {
					return -1;
				}
				if (bSegment === undefined) {
					return 1;
				}

				if (aSegment.startsWith('[') && bSegment.startsWith('[')) {
				} else if (aSegment.startsWith('[')) {
					// aSegment is a parameter
					return -1;
				} else if (bSegment.startsWith('[')) {
					// bSegment is a parameter
					return 1;
				} else {
					// Both segments are static
					const result = aSegment.localeCompare(bSegment);
					if (result !== 0) {
						return result;
					}
				}
			}

			return 0;
		})
		.reverse();
};

const buildIndex = (apiPath: string, apiEndpoints: ApiEndpoint[]) => {
	const apiDef: Partial<Record<HttpVerb, Record<string, string>>> = {};

	for (const endpoint of apiEndpoints) {
		if (!apiDef[endpoint.method]) {
			apiDef[endpoint.method] = {};
		}

		apiDef[endpoint.method]![endpoint.path] = `async () =>
			await import('${endpoint.file.replace('src/', '@/')}').then(
				(importedModule) => importedModule.${endpoint.handler},
			)`;
	}

	const indexFile = `import { Handler, HttpVerb } from '@/common/api-types';

const handlers: Partial<Record<HttpVerb, Record<string, Handler>>> = {
${Object.entries(apiDef)
	.map(
		([method, endpoints]) =>
			`	${method}: {
${Object.entries(endpoints)
	.map(([path, handler]) => `		'${path}': ${handler},`)
	.join('\n')}
	},`,
	)
	.join('\n')}
};

export default handlers;
`;

	fs.writeFileSync(path.join(path.resolve(apiPath), 'index.ts'), indexFile);
};

export const getApiEndpoints = () => {
	const apiEndpoints: ApiEndpoint[] = [];

	function handleApiFile(filepath: string, commonPrefix: string) {
		const apiHandler = handleFile(filepath, commonPrefix);
		if (!apiHandler) {
			return;
		}
		const { handlerName, method, relativePath } = apiHandler;
		apiEndpoints.push({
			layers: apiHandler.layers,
			handler: handlerName,
			method: method as HttpVerb,
			path: `/api${path.dirname(relativePath)}`,
			pathSegments: `api${path.dirname(relativePath)}`.split('/'),
			file: path.join(commonPrefix, relativePath).replace('.ts', ''),
		});
	}

	const apiPath = 'src/backend/api';
	findFiles(path.resolve(apiPath), apiPath, handleApiFile);
	sortApiEndpoints(apiEndpoints);
	buildIndex(apiPath, apiEndpoints);

	return { endpoints: apiEndpoints, watchPath: apiPath };
};

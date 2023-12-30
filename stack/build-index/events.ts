import path from 'path';
import fs from 'fs';

import { findFiles, handleFile } from './helpers';

export type EventEndpoint = {
	eventType: string;
	file: string;
	layers?: string[];
	handler: string;
	method?: undefined;
	pathSegments?: undefined;
	path?: undefined;
};

const buildIndex = (
	apiPath: string,
	eventHandlerEndpoints: EventEndpoint[],
) => {
	const apiDef: Record<string, string> = {};

	for (const endpoint of eventHandlerEndpoints) {
		apiDef[endpoint.eventType] = `async () =>
		await import('${endpoint.file.replace('src/', '@/')}').then(
			(importedModule) => importedModule.${endpoint.handler},
		)`;
	}

	const indexFile = `import { EventHandlerImport } from '@/common/api-types';

const handlers: Record<string, EventHandlerImport> = {
${Object.entries(apiDef)
	.map(([eventType, handler]) => `	'${eventType}': ${handler},`)
	.join('\n')}
};

export default handlers;
`;

	fs.writeFileSync(path.join(path.resolve(apiPath), 'index.ts'), indexFile);
};

export const getEventHandlerEndpoints = () => {
	const eventHandlerEndpoints: EventEndpoint[] = [];

	function handleEventHandlerFile(filepath: string, commonPrefix: string) {
		const eventHandler = handleFile(filepath, commonPrefix);
		if (!eventHandler) {
			return;
		}
		let { relativePath } = eventHandler;
		const { handlerName } = eventHandler;
		relativePath = relativePath.startsWith('/')
			? relativePath.slice(1)
			: relativePath;
		const eventType = path.dirname(relativePath).split('/').join('.');
		eventHandlerEndpoints.push({
			layers: eventHandler.layers,
			handler: handlerName,
			eventType,
			file: path.join(commonPrefix, relativePath).replace('.ts', ''),
		});
	}

	const apiPath = 'src/backend/events';
	findFiles(path.resolve(apiPath), apiPath, handleEventHandlerFile);
	buildIndex(apiPath, eventHandlerEndpoints);

	return { endpoints: eventHandlerEndpoints, watchPath: apiPath };
};

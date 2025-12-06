import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';

import { getApiEndpoints } from './api';
import { getEventHandlerEndpoints } from './events';
import { printChanges } from './helpers';

const execute = () => {
	const { endpoints: apiEndpoints, watchPath: apiEndpointsPath } =
		getApiEndpoints();
	const {
		endpoints: eventHandlerEndpoints,
		watchPath: eventHandlerEndpointsPath,
	} = getEventHandlerEndpoints();

	printChanges([...apiEndpoints, ...eventHandlerEndpoints]);

	return {
		apiEndpoints,
		eventHandlerEndpoints,
		watchPaths: [apiEndpointsPath, eventHandlerEndpointsPath],
	};
};

if (process.argv.includes('--watch')) {
	// eslint-disable-next-line no-console
	console.log(chalk.yellow.bold('Starting API index builder in watch mode...'));
}

const generatedApiEndpoints = execute();

export const apiEndpoints = generatedApiEndpoints.apiEndpoints;
export const eventHandlerEndpoints =
	generatedApiEndpoints.eventHandlerEndpoints;

if (process.argv.includes('--watch')) {
	for (const watchPath of generatedApiEndpoints.watchPaths) {
		fs.watch(
			path.resolve(watchPath),
			{ recursive: true },
			(operation, file) => {
				// eslint-disable-next-line no-console
				if (
					!file ||
					!file.endsWith('.ts') ||
					operation !== 'change' ||
					file === 'index.ts'
				) {
					return;
				}
				execute();
			},
		);
	}
}

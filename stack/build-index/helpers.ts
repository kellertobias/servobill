import path from 'path';
import fs from 'fs';

import chalk from 'chalk';

import { ApiEndpoint } from './api';
import { EventEndpoint } from './events';

import { HttpVerbs } from '@/common/api-types';

export function handleFile(filepath: string, commonPrefix: string) {
	const relativePath = filepath.replace(path.resolve(commonPrefix), '');
	const file = fs.readFileSync(filepath, 'utf8');

	// Check if the file exports a variable named method
	const method = file.match(/export const method = ["'](\w+)["']/)?.[1];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	if (method && !HttpVerbs.includes(method as any)) {
		return;
	}

	// Check if the file exports a variable named layers
	const layersRaw = file.match(/export const layers = \[(.+)]/)?.[1];
	let layers: string[] = [];
	if (layersRaw) {
		// Extract list of strings to array
		layers = layersRaw
			.split(',')
			.map((layer) => layer.trim().replaceAll(/["']/g, ''));
	}

	// Check if the file exports a variable named handlerName
	const handlerName =
		file.match(/export const handlerName = ["'](\w+)["']/)?.[1] || 'handler';
	// Check if the file exports a variable with the value of handlerName
	const handler = file.match(
		// eslint-disable-next-line no-useless-escape
		new RegExp(`export const ${handlerName}[:=\\s]`),
	)?.[0];

	if (!handler) {
		if (!method) {
			return;
		}
		// eslint-disable-next-line no-console
		console.log(chalk.red.bold(`Missing handler in ${relativePath}`));
		if (process.argv.includes('--watch')) {
			return;
		} else {
			throw new Error(`Missing handler export in ${relativePath}`);
		}
	}

	// Check that handler file imports reflect-metadata
	const importsReflectMetadata = file.match(
		/import ["']reflect-metadata["'];/,
	)?.[0];

	if (!importsReflectMetadata) {
		// eslint-disable-next-line no-console
		console.log(
			chalk.red.bold(`Missing import of reflect-metadata in ${relativePath}`),
		);
		if (process.argv.includes('--watch')) {
			return;
		} else {
			throw new Error(`Missing import of reflect-metadata in ${relativePath}`);
		}
	}

	return { handlerName, method, relativePath, layers };
}

export function findFiles(
	dir: string,
	commonPrefix: string,
	handleSpecificFile: (filepath: string, commonPrefix: string) => void,
) {
	// list all files in the directory
	const files = fs.readdirSync(dir);

	// iterate over all files
	for (const file of files) {
		// get file path
		const filepath = `${dir}/${file}`;

		// get stats about the current file
		const stat = fs.statSync(filepath);

		// check if the current file is a directory
		if (stat.isDirectory()) {
			// if the current path is a directory, call findFiles again
			// with the current path
			findFiles(filepath, commonPrefix, handleSpecificFile);
		} else if (filepath.endsWith('.ts')) {
			// if the current path is a file, print it out
			handleSpecificFile(filepath, commonPrefix);
		}
	}
}

const existingRoutes = new Set<string>();

const printEndpointLine = (
	endpoint: ApiEndpoint | EventEndpoint,
	change: string,
) => {
	// eslint-disable-next-line no-console
	console.log(
		`${change}${
			(endpoint as ApiEndpoint).method
				? `[${endpoint.method}] ${endpoint.path} ${chalk.gray(
						endpoint.handler,
					)}`
				: `[EVENT] ${endpoint.eventType} ${chalk.gray(endpoint.handler)}`
		}`,
	);
};

export const printChanges = (endpoints: (ApiEndpoint | EventEndpoint)[]) => {
	const lastExistedRoutes = new Set(existingRoutes);
	for (const endpoint of endpoints) {
		const hash = JSON.stringify(endpoint);
		lastExistedRoutes.delete(hash);
		if (!existingRoutes.has(hash)) {
			existingRoutes.add(hash);
			printEndpointLine(endpoint, chalk.green.bold(' (+) ►'));
		}
	}

	for (const hash of lastExistedRoutes.values()) {
		existingRoutes.delete(hash);
		const endpoint = JSON.parse(hash);
		printEndpointLine(endpoint, chalk.red.bold(' (-) ►'));
	}
};

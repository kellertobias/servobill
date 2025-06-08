/* eslint-disable import/no-extraneous-dependencies, no-console, unicorn/no-process-exit */
import fs from 'fs';
import { execSync } from 'child_process';
import * as readline from 'readline';

import boxen from 'boxen';

import { apiEndpoints, eventHandlerEndpoints } from './build-index';

// Move src/app/api to src/app/_ignore_api
const apiDir = 'src/app/api';
const tsconfigNext = 'tsconfig.json';

// original version: v123.0.1
const chromiumVersion = 'v133.0.0';

/**
 * Checks if the current git working directory is clean
 * @returns {boolean} True if the working directory is clean, false otherwise
 */
const isGitClean = (): boolean => {
	try {
		const status = execSync('git status --porcelain').toString();
		return status.trim() === '';
	} catch (error) {
		console.error('Error checking git status:', error);
		return false;
	}
};

const prepareHandlerExport = (endpoint: { file: string; handler: string }) => {
	const file = `${process.cwd()}/${endpoint.file}.ts`;
	fs.writeFileSync(
		file,
		`${fs.readFileSync(file)}
// Automatically Added. Do not commit this change.
// This export is required because of a bug in OpenTelemetry
// eslint-disable-next-line unicorn/prefer-module
module.exports = { ${endpoint.handler} };
    `,
	);
};

const prepareNextBuild = () => {
	// eslint-disable-next-line no-console
	console.log('[NextJS] Preparing Build');
	if (fs.existsSync(apiDir)) {
		console.log(`[NextJS] Removing Development API Folder: ${apiDir}`);
		fs.rmSync(apiDir, { recursive: true, force: true });
	}

	const currentTsConfigRaw = fs.readFileSync(tsconfigNext, 'utf8');
	const tsConfig = JSON.parse(currentTsConfigRaw);

	tsConfig.include = [
		'next-env.d.ts',
		'src/app/**/*.ts',
		'src/app/**/*.tsx',
		'src/common/**/*.ts',
		'src/common/**/*.tsx',
		'src/app/backend/**/*',
		'.next/types/**/*.ts',
	];

	fs.writeFileSync(tsconfigNext, JSON.stringify(tsConfig, null, 2));
};

const askToResetGit = async () => {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		rl.question(
			'Do you want to reset the repository? (y/N): ',
			(answer: string) => {
				if (answer.toLowerCase() === 'y') {
					resolve(true);
				} else {
					resolve(false);
				}
				rl.close();
			},
		);
	});
};

const resetGit = () => {
	execSync('git reset --hard');
};

// ===============================
// Main
// ===============================

export default async function main() {
	// Print welcome message in a box
	console.log(
		boxen(
			'🚀 Deploying Servobill to Production.\n\nChecking and preparing for deployment...',
			{
				padding: 1,
				margin: 1,
				borderStyle: 'round',
				borderColor: 'green',
				title: 'Deployment',
				titleAlignment: 'center',
			},
		),
	);

	// Check git status before proceeding
	if (isGitClean()) {
		console.log('✅ Git working directory is clean');
	} else {
		console.error('⚠️ Git working directory is not clean.');
		const reset = await askToResetGit();
		if (reset) {
			resetGit();
			console.log('✅ Repository has been reset.');
		} else {
			console.error(
				'⚠️ Please commit or stash your changes before proceeding.',
			);
			console.error('❌ Aborting deployment.');
			process.exit(1);
		}
	}

	// remove extra dependencies (pg, sqlite, sqlite3)
	console.log('Removing extra dependencies (pg, sqlite, sqlite3)');
	execSync('npm r -D pg sqlite sqlite3');
	execSync('npm r -S pg sqlite sqlite3');
	console.log('✅ Extra dependencies removed');
	console.log('\n\n\n');

	// prepare chromium layer
	// check if layers/chromium exists
	// if not, download it
	// Check if chromium layer directory exists
	if (fs.existsSync('./layers/chromium')) {
		console.log('✅ Chromium layer exists');
	} else {
		console.log('⚠️ Chromium layer not found. Downloading...');

		// Create layers directory if it doesn't exist
		if (!fs.existsSync('./layers')) {
			fs.mkdirSync('./layers');
		}

		// Download chromium layer
		const chromiumUrl = `https://github.com/Sparticuz/chromium/releases/download/${chromiumVersion}/chromium-${chromiumVersion}-layer.zip`;
		const zipPath = './layers/chromium.zip';

		console.log('Downloading chromium layer...');
		execSync(`wget ${chromiumUrl} -O ${zipPath}`);

		// Unzip the file
		console.log('Extracting chromium layer...');
		execSync(`unzip ${zipPath} -d ./layers/chromium`);

		// Remove zip file
		console.log('Cleaning up...');
		fs.unlinkSync(zipPath);

		console.log('✅ Chromium layer setup complete.');
	}

	console.log('Preparing NextJS Build (removing api folder)');
	prepareNextBuild();
	console.log('\n\n\n');

	for (const endpoint of [...apiEndpoints, ...eventHandlerEndpoints]) {
		prepareHandlerExport(endpoint);
	}

	console.log('\n\n\n');

	console.log('✅ Preparation Complete.');
	console.log('Now running deployment...');
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void main();

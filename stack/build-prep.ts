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

// this function is there for the sake of readability
// in processes that might happen instantly, we want
// the user to show that there is progress
const wait = async () =>
	await new Promise((resolve) => setTimeout(resolve, 500));

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
	if (fs.existsSync(apiDir)) {
		process.stdout.write(
			`\r ℹ️ [NextJS] Removing Development API Folder: ${apiDir}`,
		);
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
			'    Do you want to reset the repository? (y/N): ',
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
			`🚀 Preparing to Deploy Servobill Serverless

This script will:
- Make sure the git working directory is clean
- Remove dependencies only needed for dockerized deployment
- Prepare the chromium layer
- prepare handler index files
- remove development API implementation

after this script, you can deploy sst to production
and then reset via \`git checkout -- . \``,

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
	process.stdout.write(' ℹ️ Checking git status');

	await wait();
	if (isGitClean()) {
		process.stdout.write('\r ✅ Git working directory is clean\n\n');
	} else {
		process.stdout.write('\r ⚠️ Git working directory is not clean:\n');
		const reset = await askToResetGit();
		if (reset) {
			resetGit();
			process.stdout.write('\r ✅ Repository has been reset.\n\n');
		} else {
			process.stdout.write(
				'\r ❌ Aborting deployment.\n    Please commit or stash your changes before proceeding.\n\n',
			);
			process.exit(1);
		}
	}

	// remove extra dependencies (pg, sqlite, sqlite3)
	process.stdout.write(' ℹ️ Removing extra dependencies (pg, sqlite, sqlite3)');
	execSync('npm r -D pg sqlite sqlite3');
	execSync('npm r -S pg sqlite sqlite3');
	process.stdout.write('\r ✅ Extra dependencies removed\n\n');

	// prepare chromium layer
	// check if layers/chromium exists
	// if not, download it
	// Check if chromium layer directory exists
	if (fs.existsSync('./layers/chromium')) {
		console.log(' ✅ Chromium layer exists\n');
	} else {
		process.stdout.write(' ⚠️ Chromium layer not found. Downloading...');

		// Create layers directory if it doesn't exist
		if (!fs.existsSync('./layers')) {
			fs.mkdirSync('./layers');
		}

		// Download chromium layer
		const chromiumUrl = `https://github.com/Sparticuz/chromium/releases/download/${chromiumVersion}/chromium-${chromiumVersion}-layer.zip`;
		const zipPath = './layers/chromium.zip';

		process.stdout.write('\r ℹ️ Downloading chromium layer...');
		execSync(`wget ${chromiumUrl} -O ${zipPath}`);

		// Unzip the file
		process.stdout.write('\r ℹ️ Extracting chromium layer...');
		execSync(`unzip ${zipPath} -d ./layers/chromium`);

		// Remove zip file
		process.stdout.write('\r ℹ️ Cleaning up...');
		fs.unlinkSync(zipPath);

		process.stdout.write('\r ✅ Chromium layer setup complete.\n\n');
	}

	process.stdout.write(' ℹ️ Preparing NextJS Build (removing api folder)');
	await wait();
	prepareNextBuild();
	process.stdout.write('\r ✅ NextJS Build prepared: API folder removed\n\n');

	process.stdout.write(' ℹ️ Preparing handler index files');
	await wait();
	for (const endpoint of [...apiEndpoints, ...eventHandlerEndpoints]) {
		prepareHandlerExport(endpoint);
	}
	process.stdout.write('\r ✅ Handler index files prepared\n\n');

	await wait();
	console.log(' ✅ Preparation Complete. Ready to run deployment...');
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void main();

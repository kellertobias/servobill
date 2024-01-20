import fs from 'fs';

// Move src/app/api to src/app/_ignore_api
const apiDir = 'src/app/api';
const ignoreApiDir = '_ignore_api';
const tsconfigNext = 'tsconfig.json';

let tsconfigOriginal: string | undefined;

export const prepareNextBuild = () => {
	// eslint-disable-next-line no-console
	console.log('[NextJS] Preparing Build');
	if (fs.existsSync(apiDir)) {
		fs.renameSync(apiDir, ignoreApiDir);
	}
	const currentTsConfigRaw = fs.readFileSync(tsconfigNext, 'utf8');
	tsconfigOriginal = currentTsConfigRaw;
	const tsConfig = JSON.parse(currentTsConfigRaw);
	tsConfig.include = [
		'next-env.d.ts',
		'src/app/**/*.ts',
		'src/app/**/*.tsx',
		'src/common/**/*.ts',
		'src/common/**/*.tsx',
		'.next/types/**/*.ts',
	];
	tsConfig.exclude = [
		...tsConfig.exclude,
		`${ignoreApiDir}/**/*`,
		'src/app/backend/**/*',
	];

	fs.writeFileSync(tsconfigNext, JSON.stringify(tsConfig, null, 2));
};

export const restoreAfterNextBuild = () => {
	// eslint-disable-next-line no-console
	console.log('[NextJS] Restoring After Build');
	if (fs.existsSync(ignoreApiDir)) {
		fs.renameSync(ignoreApiDir, apiDir);
	}
	if (tsconfigOriginal) {
		fs.writeFileSync(tsconfigNext, tsconfigOriginal);
	}
};

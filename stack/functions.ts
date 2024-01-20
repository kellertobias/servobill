import fs from 'fs';

export const prepareHandlerExport = (endpoint: {
	file: string;
	handler: string;
}) => {
	console.log('prepareHandlerExport', endpoint);
	console.log(process.cwd());
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

import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { StackContext } from 'sst/constructs';

export const makeLogGroup = (stack: StackContext['stack'], parts: string[]) => {
	const pathParts = parts
		.flatMap((part) => {
			// Split on non-alphanumeric characters
			const parts = part.split(/[^\dA-Za-z]/);
			return parts;
		})
		.filter((part) => part.length > 0);

	const logicalName =
		'LogGroup' +
		pathParts.map((part) => part[0].toUpperCase() + part.slice(1)).join('');

	const path = pathParts.join('/');
	console.log(`[LogGroup] ${path} - ${logicalName}`);
	return new LogGroup(stack, logicalName, {
		logGroupName: `/invoices/${path}/`,
		retention: RetentionDays.TWO_MONTHS,
	});
};

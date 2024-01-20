/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// eslint-disable-next-line import/no-extraneous-dependencies
import { randomUUID } from 'crypto';

import chalk from 'chalk';
import express from 'express';

import handlers from '@/backend/events';
import { CustomJson } from '@/common/json';
const port = process.env.PORT || 9326;

const app = express();
app.use(express.json({ type: '*/*' }));

const eventQueue: {
	eventId: string;
	data: unknown;
	type: string;
	source: string;
	resources: string[];
}[] = [];

app.all('/', (req, res) => {
	if (req.headers['x-amz-target'] !== 'AWSEvents.PutEvents') {
		console.log(
			"Received Request that is not 'AWSEvents.PutEvents'",
			req.headers['x-amz-target'],
		);
		res.status(400).send({ error: 'Bad Request' });
		return;
	}

	res.setHeader('x-amzn-RequestId', randomUUID().toString());
	res.setHeader('Content-Type', 'application/x-amz-json-1.1');

	console.log('Received Event:');
	const entries = req.body.Entries;
	const eventIds: string[] = [];
	for (const entry of entries) {
		const { Detail, DetailType, ...rest } = entry;
		const body = CustomJson.fromJson(Detail);
		console.log(
			chalk.bgBlue('[EventBus] IN '),
			DetailType,
			chalk.grey(JSON.stringify(rest)),
		);
		const eventId = randomUUID().toString();
		eventIds.push(eventId);
		eventQueue.push({
			eventId,
			data: body,
			type: DetailType,
			...rest,
		});
	}

	res.json({
		FailedEntryCount: 0,
		Entries: eventIds.map((eventId) => ({ EventId: eventId })),
	});
	res.end();
});

const handleNextEvent = async () => {
	const event = eventQueue.shift();
	if (!event) {
		return;
	}
	const { type } = event;
	const handlerImport = handlers[type];
	if (!handlerImport) {
		console.log(
			chalk.bgBlue('[EventBus] Error '),
			chalk.red(`No handler for event type ${type}`),
		);
		return;
	}
	const handler = await handlerImport();
	console.log(chalk.bgBlue('[EventBus] Handling '), type, event.eventId);
	const origLog = console.log;
	try {
		console.log = (...args: any[]) => {
			origLog(chalk.bgBlue('[EventBus] HANDLER '), ...args);
		};
		await handler(
			{
				id: event.eventId,
				version: '0',
				account: process.env.AWS_ACCOUNT || '123456789012',
				time: new Date().toISOString(),
				region: process.env.AWS_REGION || 'eu-central-1',
				resources: event.resources,
				source: event.source,
				'detail-type': type,
				detail: event.data,
			},
			{
				callbackWaitsForEmptyEventLoop: false,
				functionName: type,
				functionVersion: '0',
				invokedFunctionArn: `arn:aws:lambda:${process.env.AWS_REGION}:${
					process.env.AWS_ACCOUNT || '123456789012'
				}:function:${type}:0`,
				memoryLimitInMB: '1024',
				awsRequestId: randomUUID().toString(),
				logGroupName: '/aws/lambda/' + type,
				logStreamName: `0000/00/00/[$LATEST]${randomUUID().toString()}`,
				getRemainingTimeInMillis: () => {
					return 1000;
				},
				done: (error?: Error, result?: any) => null,
				fail: (error: Error | string) => null,
				succeed: (messageOrObject: any) => null,
			},
			() => null,
		);
	} catch (error: unknown) {
		console.log(
			chalk.bgBlue('[EventBus] Error '),
			chalk.red(`Error while handling event ${type}`),
			error,
		);
	}
	console.log = origLog;
	console.log(chalk.bgBlue('[EventBus] Done '), type, event.eventId);
};

const waitForNextEvent = () => {
	setTimeout(async () => {
		await handleNextEvent();
		waitForNextEvent();
	}, 100);
};

waitForNextEvent();

app.listen(port, () => {
	console.log(`EventBus Dev Router listening on port ${port}`);
});

/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// eslint-disable-next-line import/no-extraneous-dependencies
import { randomUUID } from 'crypto';

import chalk from 'chalk';
import express from 'express';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { config as dotenvConfig } from 'dotenv';

import handlers from '@/backend/events';
import { CustomJson } from '@/common/json';
const port = process.env.PORT || 9326;

// Load environment variables from .env file for local development
dotenvConfig();

const app = express();
app.use(express.json({ type: '*/*' }));

/**
 * Initializes and manages the SQLite database for persisting event jobs.
 * All jobs are stored until they are executed, ensuring durability across restarts.
 */
let db: Database<sqlite3.Database, sqlite3.Statement>;

/**
 * Initialize the SQLite database and create the jobs table if it doesn't exist.
 */
async function initDb() {
	db = await open({
		filename: './event-queue.db',
		driver: sqlite3.Database,
	});
	await db.run(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      source TEXT,
      resources TEXT,
      data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Enqueue a new job into the database.
 * @param job The job object to store.
 */
async function enqueueJob(job: {
	eventId: string;
	data: unknown;
	type: string;
	source: string;
	resources: string[];
}) {
	await db.run(
		`INSERT INTO jobs (id, type, source, resources, data) VALUES (?, ?, ?, ?, ?)`,
		job.eventId,
		job.type,
		job.source,
		JSON.stringify(job.resources),
		JSON.stringify(job.data),
	);
}

/**
 * Dequeue (fetch and remove) the next job from the database.
 * @returns The next job or null if none exist.
 */
async function dequeueJob() {
	const row = await db.get(
		`SELECT * FROM jobs ORDER BY created_at ASC LIMIT 1`,
	);
	if (!row) {
		return null;
	}
	await db.run(`DELETE FROM jobs WHERE id = ?`, row.id);
	return {
		eventId: row.id,
		type: row.type,
		source: row.source,
		resources: JSON.parse(row.resources),
		data: JSON.parse(row.data),
	};
}

app.all('/', async (req, res) => {
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
		// Persist the job in the database
		await enqueueJob({
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
	const event = await dequeueJob();
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
		try {
			await handleNextEvent();
		} catch (error: unknown) {
			console.log(
				chalk.bgBlue('[EventBus] Error '),
				chalk.red(`Error while handling event`),
				error,
			);
		}
		waitForNextEvent();
	}, 100);
};

// Initialize the database and start the event loop
// NOTE: You must install the 'sqlite' package for this to work:
// npm install sqlite
// If using TypeScript, you may also need: npm install --save-dev @types/sqlite3
// For environments that support top-level await, you can use:
// (async () => { await initDb(); waitForNextEvent(); app.listen(port, ...); })();
initDb()
	.then(() => {
		waitForNextEvent();
		app.listen(port, () => {
			console.log(`EventBus Dev Router listening on port ${port}`);
		});
		return;
	})
	// eslint-disable-next-line unicorn/prefer-top-level-await
	.catch((error) => {
		console.error('Failed to initialize SQLite DB:', error);
		// eslint-disable-next-line unicorn/no-process-exit
		process.exit(1);
	});

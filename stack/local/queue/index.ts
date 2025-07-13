/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { randomUUID } from 'crypto';

import chalk from 'chalk';
import express from 'express';
// eslint-disable-next-line import/no-extraneous-dependencies
import sqlite3 from 'sqlite3';
import { config as dotenvConfig } from 'dotenv';

import handlers from '@/backend/events';
import { CustomJson } from '@/common/json';
const port = process.env.PORT || 9326;

// Load environment variables from .env file for local development
// Load environment variables from .env and .env.dev files
// .env.dev will override any values from .env
dotenvConfig(); // Load base .env first
dotenvConfig({ path: '.env.dev', override: true }); // Load .env.dev and override

const app = express();
app.use(express.json({ type: '*/*' }));

/**
 * Initializes and manages the SQLite database for persisting event jobs.
 * All jobs are stored until they are executed, ensuring durability across restarts.
 */
let db: sqlite3.Database;

/**
 * Promisified wrapper for running a SQL command.
 * @param sql The SQL statement to run.
 * @param params The parameters for the SQL statement.
 * @returns Promise that resolves when the command completes.
 */
function runAsync(sql: string, params: any[] = []): Promise<void> {
	return new Promise((resolve, reject) => {
		db.run(sql, params, function (err) {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
}

/**
 * Promisified wrapper for getting a single row from the database.
 * @param sql The SQL statement to run.
 * @param params The parameters for the SQL statement.
 * @returns Promise that resolves with the row, or undefined if not found.
 */
function getAsync<T = any>(
	sql: string,
	params: any[] = [],
): Promise<T | undefined> {
	return new Promise((resolve, reject) => {
		db.get(sql, params, function (err, row) {
			if (err) {
				reject(err);
			} else {
				resolve(row as T | undefined);
			}
		});
	});
}

/**
 * Initialize the SQLite database and create the jobs table if it doesn't exist.
 */
async function initDb() {
	return new Promise<void>((resolve, reject) => {
		db = new sqlite3.Database('./event-queue.db', (err) => {
			if (err) {
				reject(err);
				return;
			}
			db.run(
				`CREATE TABLE IF NOT EXISTS jobs (
				  id TEXT PRIMARY KEY,
				  type TEXT NOT NULL,
				  source TEXT,
				  resources TEXT,
				  data TEXT NOT NULL,
				  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
				)`,
				(err) => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				},
			);
		});
	});
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
	await runAsync(
		`INSERT INTO jobs (id, type, source, resources, data) VALUES (?, ?, ?, ?, ?)`,
		[
			job.eventId,
			job.type,
			job.source,
			JSON.stringify(job.resources),
			JSON.stringify(job.data),
		],
	);
}

/**
 * Dequeue (fetch and remove) the next job from the database.
 * @returns The next job or null if none exist.
 */
async function dequeueJob() {
	const row = await getAsync<any>(
		`SELECT * FROM jobs ORDER BY created_at ASC LIMIT 1`,
	);
	if (!row) {
		return null;
	}
	await runAsync(`DELETE FROM jobs WHERE id = ?`, [row.id]);
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
		/**
		 * Periodically enqueue a 'cron' event every 5 minutes.
		 *
		 * This simulates a scheduled cron job in the local event bus, allowing handlers
		 * to perform periodic tasks (e.g., cleanup, scheduled reports, etc.) as if triggered by AWS EventBridge.
		 *
		 * The event will be picked up and processed by the existing event handler system.
		 */
		setInterval(
			async () => {
				try {
					const eventId = randomUUID().toString();
					await enqueueJob({
						eventId,
						type: 'cron',
						source: 'local-cron',
						resources: [],
						data: {},
					});
					console.log(
						chalk.bgBlue('[EventBus] CRON'),
						`Enqueued cron event (${eventId})`,
					);
				} catch (error) {
					console.error(
						chalk.bgBlue('[EventBus] CRON'),
						'Failed to enqueue cron event:',
						error,
					);
				}
			},
			5 * 60 * 1000,
		); // 5 minutes in milliseconds

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

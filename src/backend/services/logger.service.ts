import { context, trace } from '@opentelemetry/api';
import pino from 'pino';

const logLevels = [
	'unspecified',
	'trace',
	'debug',
	'info',
	'warn',
	'error',
	'fatal',
] as const;

type LogLevel = (typeof logLevels)[number];

const pinoLogger = pino({
	level: process.env.LOG_LEVEL || 'info',
	useOnlyCustomLevels: true,
	customLevels: {
		unspecified: 0,
		trace: 1,
		debug: 5,
		info: 9,
		warn: 13,
		error: 17,
		fatal: 21,
	},
	mixin() {
		const activeContext = context.active();
		const activeSpan = trace.getSpan(activeContext);
		const activeSpanContext = activeSpan?.spanContext();
		return {
			...activeSpanContext,
		};
	},
});

export class Logger {
	private logger: pino.Logger<LogLevel>;
	constructor(private readonly moduleName: string) {
		this.logger = pinoLogger.child({ module: this.moduleName });
	}

	public log(
		level: LogLevel,
		message: string,
		context?: Record<string, unknown>,
	) {
		this.logger[level](context, message);
	}

	public debug(message: string, context?: Record<string, unknown>): void {
		this.log('debug', message, context);
	}

	public info(message: string, context?: Record<string, unknown>): void {
		this.log('info', message, context);
	}

	public warn(message: string, context?: Record<string, unknown>): void {
		this.log('warn', message, context);
	}

	public error(message: string, context?: Record<string, unknown>): void {
		this.log('error', message, context);
	}
}

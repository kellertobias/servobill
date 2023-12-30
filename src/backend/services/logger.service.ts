import chalk from 'chalk';

const logLevels = ['debug', 'info', 'warn', 'error'] as const;

type LogLevel = (typeof logLevels)[number];

export class Logger {
	private logLevel: LogLevel;
	constructor(private readonly moduleName: string) {
		this.logLevel =
			process.env.LOG_LEVEL || process.env.NODE_ENV === 'development'
				? 'debug'
				: 'warn';
	}

	public log(
		level: LogLevel,
		message: string,
		context?: Record<string, unknown>,
	) {
		if (this.logLevel === 'debug') {
			// eslint-disable-next-line no-console
			console.log(
				chalk.bgBlue(`${level.toUpperCase().padEnd(5)} [${this.moduleName}]`),
				...[message, context].filter((x) => x !== undefined),
			);
		} else {
			if (logLevels.indexOf(level) >= logLevels.indexOf(this.logLevel)) {
				// eslint-disable-next-line no-console
				console.log(
					JSON.stringify({
						module: this.moduleName,
						level,
						message,
						context,
					}),
				);
			}
		}
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

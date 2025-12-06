import 'reflect-metadata';

import { DefaultContainer, Service } from '@/common/di';
import { Span } from '../instrumentation';
import { Logger } from './logger.service';

export enum CqrsCommandType {
	Query = 'query',
	Command = 'command',
}

export abstract class ICqrsCommand<C = unknown, R = unknown> {
	public static type = CqrsCommandType.Command;
	public request: C;
	public response!: R;

	constructor(props: C) {
		this.request = props;
	}
}

export abstract class ICqrsHandler<C extends ICqrsCommand> {
	public abstract execute(command: C['request']): Promise<C['response']>;
}

// export a class decorator CqrsHandler
// that takes a command class as an argument
// and adds a static property cqrsHandlerFor with the command class as a value
export function CqrsHandler<C extends new (...args: any[]) => ICqrsCommand>(
	CommandClass: C,
): ClassDecorator {
	// biome-ignore lint/suspicious/noShadowRestrictedNames: boilerplate
	// biome-ignore lint/complexity/noBannedTypes: boilerplate
	return (constructor: Function) => {
		const type = (CommandClass as any).type;
		const name = CommandClass.name;
		(constructor as any).cqrsHandlerFor = { name, type };

		Service()(constructor as any);
	};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CqrsHandlerType = new (...args: any[]) => ICqrsHandler<ICqrsCommand>;

@Service()
export class CqrsBus {
	private logger = new Logger(CqrsBus.name);
	public static forRoot({
		handlers,
		container = DefaultContainer,
	}: {
		handlers: CqrsHandlerType[];
		container: typeof DefaultContainer;
	}) {
		const bus = container.isBound(CqrsBus)
			? container.get(CqrsBus)
			: (() => {
					const bus = new CqrsBus(container);
					container.bind(CqrsBus).toConstantValue(bus);
					return bus;
				})();

		bus.registerHandlers(handlers);

		return bus;
	}

	private queryHandlers: Record<string, CqrsHandlerType> = {};
	private commandHandlers: Record<string, CqrsHandlerType> = {};
	constructor(private container: typeof DefaultContainer = DefaultContainer) {}

	protected registerHandlers(handlers: CqrsHandlerType[]) {
		handlers.forEach((handler) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const commandClass = (handler as any).cqrsHandlerFor;
			// container.set(handler, new handler());
			if (commandClass) {
				if (commandClass.type === CqrsCommandType.Query) {
					this.queryHandlers[commandClass.name] = handler;
				} else {
					this.commandHandlers[commandClass.name] = handler;
				}
			} else {
				throw new Error(`No command class found for handler ${handler.name}`);
			}
		});
	}

	private getHandler<C extends ICqrsCommand>(command: C) {
		const commandName = command.constructor.name;
		const Handler = this.commandHandlers[commandName];

		try {
			return this.container.get(Handler);
		} catch (error) {
			this.logger.error(`Failed to get command handler for ${commandName}`, {
				error,
			});
			throw new Error(`Command Handler ${commandName} not registered`);
		}
	}

	@Span('CqrsBus.execute')
	public async execute<C extends ICqrsCommand>(
		command: C,
	): Promise<C['response']> {
		const commandName = command.constructor.name;
		const handler = this.getHandler(command);

		if (handler) {
			this.logger.debug(`Executing Handler for ${commandName}`, {
				request: command.request,
			});
			const response = await handler.execute(command.request);
			this.logger.debug(`Handler for ${commandName} executed`, { response });
			return response;
		}
		throw new Error(`No handler found for command ${command.constructor.name}`);
	}
}

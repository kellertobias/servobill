/* eslint-disable @typescript-eslint/no-explicit-any */
import { Container, injectable } from 'inversify';

import { Logger } from '@/backend/services/logger.service';

export class App {
	static defaultLogger = new Logger(App.name);
	static defaultContainer = new Container();
	static forRoot({ modules }: { modules: (new () => unknown)[] }) {
		const container = new Container();

		for (const Module of modules) {
			container.bind(Module.name).to(Module);
		}

		return new this(container);
	}

	static get<T>(type: string | symbol | (new (...args: unknown[]) => T)) {
		return this.defaultContainer.get<T>(type);
	}

	constructor(private readonly container: Container) {}

	get<T>(type: string | symbol | (new (...args: unknown[]) => T)) {
		return this.container.get<T>(type);
	}
}

export { inject as Inject } from 'inversify';

export function Service<T extends new (...args: any[]) => unknown>(
	nameOrOptions?:
		| string
		| symbol
		| {
				name?: string | symbol;
				singleton?: boolean;
				shouldRegister?: () => boolean;
		  },
): (target: T) => T {
	return function (target: T) {
		const { name, singleton, shouldRegister } =
			typeof nameOrOptions === 'string' || typeof nameOrOptions === 'symbol'
				? { name: nameOrOptions, singleton: false, shouldRegister: () => true }
				: nameOrOptions || {};

		App.defaultLogger.debug(
			`Registering Service *${name ? String(name) : target.name}*`,
		);
		const injected = injectable()(target);
		if (shouldRegister && !shouldRegister()) {
			return target;
		}
		const bound = App.defaultContainer.bind(name || target).to(target);
		if (singleton === false) {
			bound.inTransientScope();
		} else {
			bound.inSingletonScope();
		}
		return injected;
	};
}

export const DefaultContainer = App.defaultContainer;

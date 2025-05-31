/* eslint-disable @typescript-eslint/no-explicit-any */
import { Container, injectable } from 'inversify';

import { Logger } from '@/backend/services/logger.service';

export type ModuleToken = new (...args: any[]) => unknown;
export type ModuleBinding =
	| { token: string | symbol | ModuleToken; module: ModuleToken }
	| { token: string | symbol | ModuleToken; value: any }
	| ModuleToken;

export class App {
	static defaultLogger = new Logger(App.name);
	static defaultContainer = new Container();
	static forRoot({ modules }: { modules: ModuleBinding[] }) {
		const container = new Container();

		for (const Module of modules) {
			if (typeof Module === 'function') {
				container.bind(Module.name).to(Module);
			} else if ('module' in Module) {
				container.bind(Module.token).to(Module.module);
			} else {
				container.bind(Module.token).toConstantValue(Module.value);
			}
		}

		return new this(container);
	}

	static get<T>(type: string | symbol | (new (...args: any[]) => T)) {
		return this.defaultContainer.get<T>(type);
	}

	constructor(private readonly container: Container) {}

	get<T>(type: string | symbol | (new (...args: any[]) => T)) {
		return this.container.get<T>(type);
	}

	bind<T>(
		type: string | symbol | (new (...args: any[]) => T),
		to?:
			| {
					module: new () => T;
					value?: never;
			  }
			| {
					module?: never;
					value: T;
			  },
	) {
		if (typeof type === 'function') {
			this.container.bind(type.name).to(type);
		} else if (to && 'module' in to && to.module) {
			this.container.bind(type).to(to.module);
		} else if (to && 'value' in to && to.value) {
			this.container.bind(type).toConstantValue(to.value);
		} else {
			throw new Error('Invalid type or to');
		}
	}

	create<T>(type: new (...args: any[]) => T): T {
		const token = Symbol();
		this.bind(token, { module: type });
		return this.get(token);
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

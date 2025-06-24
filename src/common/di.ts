/* eslint-disable @typescript-eslint/no-explicit-any */
import { Container, injectable } from 'inversify';

import { Logger } from '@/backend/services/logger.service';

export const DEFAULT_TEST_SET = 'default';

export type ModuleToken = new (...args: any[]) => unknown;
export type ModuleTokenName = string | symbol | ModuleToken;
export type ModuleBinding =
	| { token: ModuleTokenName; module: ModuleToken }
	| { token: ModuleTokenName; value: any }
	| ModuleToken;

export class App {
	static skipDefaultRegistration = false;
	static defaultLogger = new Logger(App.name);
	static defaultContainer = new Container();
	static forRoot({ modules }: { modules: ModuleBinding[] }) {
		const container = new Container();
		const app = new this(container);

		for (const Module of modules) {
			if (typeof Module === 'function') {
				app.bind(Module);
			} else if ('module' in Module) {
				app.bind(Module.token, { module: Module.module });
			} else {
				app.bind(Module.token, { value: Module.value });
			}
		}

		return app;
	}

	static get<T>(type: string | symbol | (new (...args: any[]) => T)) {
		return this.defaultContainer.get<T>(type);
	}

	static testSets: Record<
		string,
		{ token: ModuleTokenName; module: ModuleToken }[]
	> = {};

	static addToTestSet(
		testSet: string,
		binding: { token: ModuleTokenName; module: ModuleToken },
	) {
		if (!this.testSets[testSet]) {
			this.testSets[testSet] = [];
		}
		this.testSets[testSet].push(binding);
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
			if (process.env.DI_DEBUG) {
				// eslint-disable-next-line no-console
				console.log(` * Binding ${type.name} to ${type.name}`);
			}
		} else {
			const tokenName = typeof type === 'symbol' ? String(type) : type;
			if (to && 'module' in to && to.module) {
				this.container.bind(type).to(to.module);
				if (process.env.DI_DEBUG) {
					// eslint-disable-next-line no-console
					console.log(` * Binding ${tokenName} to ${to.module.name}`);
				}
			} else if (to && 'value' in to && to.value) {
				this.container.bind(type).toConstantValue(to.value);
				if (process.env.DI_DEBUG) {
					// eslint-disable-next-line no-console
					console.log(` * Binding ${tokenName} to <FIXED VALUE>`);
				}
			} else {
				throw new Error('Invalid type or to');
			}
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
				addToTestSet?: string[];
		  },
): (target: T) => T {
	return function (target: T) {
		const { name, singleton, shouldRegister, addToTestSet } =
			typeof nameOrOptions === 'string' || typeof nameOrOptions === 'symbol'
				? {
						name: nameOrOptions,
						singleton: false,
						shouldRegister: () => true,
						addToTestSet: [],
					}
				: nameOrOptions || {};

		const injected = injectable()(target);

		if (addToTestSet && addToTestSet.length > 0) {
			for (const testSet of addToTestSet) {
				App.addToTestSet(testSet, {
					token: name || target,
					module: target,
				});
			}
		} else {
			App.addToTestSet(DEFAULT_TEST_SET, {
				token: name || target,
				module: target,
			});
		}

		if (App.skipDefaultRegistration) {
			if (!process.env.VITEST) {
				throw new Error(
					`Skipping import registration for ${
						name ? String(name) : target.name
					} - this should only happen in tests`,
				);
			}
			return target;
		}

		if (shouldRegister && !shouldRegister()) {
			return target;
		}

		App.defaultLogger.debug(
			`Registering Service *${name ? String(name) : target.name}* ${
				target.name
			}`,
		);
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

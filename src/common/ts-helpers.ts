/* eslint-disable @typescript-eslint/no-explicit-any */
export type ObjectProperties<T> = {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	[K in keyof T as T[K] extends (...args: any[]) => any
		? never
		: K]: T[K] extends object
		? // biome-ignore lint/suspicious/noExplicitAny: <explanation>
			T[K] extends any[]
			? ObjectProperties<T[K][number]>[]
			: ObjectProperties<T[K]>
		: T[K];
};

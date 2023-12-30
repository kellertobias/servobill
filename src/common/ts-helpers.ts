/* eslint-disable @typescript-eslint/no-explicit-any */
export type ObjectProperties<T> = {
	[K in keyof T as T[K] extends (...args: any[]) => any
		? never
		: K]: T[K] extends object
		? T[K] extends any[]
			? ObjectProperties<T[K][number]>[]
			: ObjectProperties<T[K]>
		: T[K];
};

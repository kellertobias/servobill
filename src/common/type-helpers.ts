/**
 * Helper type to create a union type where at least one property from a tuple must be defined
 */
type AtLeastOneFromTuple<T extends string> = {
	[K in T]: { [P in K]: string } & { [P in Exclude<T, K>]?: string };
}[T];

/**
 * Helper type to create a union of objects where at least one property from each tuple must be defined
 */
export type AtLeastOneFromEach<T extends readonly (readonly string[])[]> = {
	[K in keyof T]: T[K] extends readonly [infer Single]
		? Record<Single & string, string>
		: T[K] extends readonly (infer U)[]
			? AtLeastOneFromTuple<U & string>
			: never;
}[number];

/**
 * Helper type to convert a union to an intersection
 */
export type UnionToIntersection<U> =
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(U extends any ? (k: U) => void : never) extends (k: infer I) => void
		? I
		: never;

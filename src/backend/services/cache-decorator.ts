/**
 * A method decorator for caching async function results in memory with a TTL.
 *
 * @param getKey - A function that receives the method arguments and returns a string[] to form the cache key.
 * @param ttl - Time to live for the cache entry, in seconds.
 *
 * Usage:
 *   @Cached({ getKey: (expense) => [expense.categoryId], ttl: 60 })
 *   async category(expense: Expense) { ... }
 */
export function Cached({
	getKey,
	ttl,
}: {
	getKey: (...args: any[]) => (string | number | boolean | undefined | null)[];
	ttl: number;
}) {
	console.log('CALLED @CACHED');
	// The cache is a static Map shared across all decorated methods/classes
	// Structure: Map<cacheKey, { value: any, expires: number }>
	const cache = new Map<string, { value: any; expires: number }>();

	return function (target: any, propertyKey: string, descriptor: any) {
		const originalMethod = descriptor.value!;

		descriptor.value = async function (this: any, ...args: unknown[]) {
			const key = getKey(...args).join('::');
			console.log('CALLED @CACHED', key);
			const now = Date.now();
			const cached = cache.get(key);
			if (cached && cached.expires > now) {
				return cached.value;
			}
			const result = await originalMethod.apply(this, args);
			console.log('CACHING @CACHED', key, result);
			cache.set(key, { value: result, expires: now + ttl * 1000 });
			return result;
		} as typeof originalMethod;

		return descriptor as TypedPropertyDescriptor<any>;
	};
}

import { describe, expect, it } from 'vitest';

import { DeferredPromise } from './deferred';

/**
 * Unit tests for DeferredPromise utility class.
 * Ensures correct behavior for resolve and reject cases.
 */
describe('DeferredPromise', () => {
	it('should resolve with the provided value', async () => {
		const deferred = new DeferredPromise<number>();
		deferred.resolve(42);
		await expect(deferred.promise).resolves.toBe(42);
	});

	it('should reject with the provided reason', async () => {
		const deferred = new DeferredPromise<number>();
		const error = new Error('fail');
		deferred.reject(error);
		await expect(deferred.promise).rejects.toThrow('fail');
	});
});

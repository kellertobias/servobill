/* eslint-disable unicorn/no-useless-undefined */
import { describe, expect, it } from 'vitest';

import { centsToPrice, priceToCents } from './money';

/**
 * Unit tests for money utility functions.
 * These functions are pure and have no external dependencies.
 */
describe('centsToPrice', () => {
	it('should convert cents to price string correctly', () => {
		expect(centsToPrice(123)).toBe('1.23');
		expect(centsToPrice(0)).toBe('0.00');
		expect(centsToPrice(5)).toBe('0.05');
		expect(centsToPrice(100)).toBe('1.00');
		expect(centsToPrice(-150)).toBe('-1.50');
	});

	it('should handle undefined or null input as 0', () => {
		expect(centsToPrice(undefined)).toBe('0.00');
		expect(centsToPrice(null)).toBe('0.00');
	});
});

describe('priceToCents', () => {
	it('should convert price string to cents correctly', () => {
		expect(priceToCents('1.23')).toBe(123);
		expect(priceToCents('0.05')).toBe(5);
		expect(priceToCents('1.00')).toBe(100);
		expect(priceToCents('0.00')).toBe(0);
		expect(priceToCents('12.99')).toBe(1299);
		expect(priceToCents('0.5')).toBe(50); // single digit cents
		expect(priceToCents('1,23')).toBe(123); // comma as decimal
		expect(priceToCents('1.2')).toBe(120); // single digit cents
		expect(priceToCents('1.')).toBe(100); // no cents
		expect(priceToCents('1')).toBe(100); // no decimal part
		expect(priceToCents('-1.50')).toBe(-150); // negative not handled
		expect(priceToCents('€1.23')).toBe(123); // euro symbol
		expect(priceToCents(' 1.23 ')).toBe(123); // whitespace
	});

	it('should handle undefined, null, or empty input as 0', () => {
		expect(priceToCents(undefined)).toBe(0);
		expect(priceToCents(null)).toBe(0);
		expect(priceToCents('')).toBe(0);
	});

	it('should handle malformed input gracefully', () => {
		expect(priceToCents('abc')).toBe(Number.NaN);
		expect(priceToCents('1.2.3')).toBe(Number.NaN);
		expect(priceToCents('.99')).toBe(Number.NaN);
	});
});

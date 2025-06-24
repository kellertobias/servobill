/**
 * This test file uses Vitest as the testing framework instead of Jest.
 * The test API is compatible, but imports are now from 'vitest'.
 */
import { describe, it, expect } from 'vitest';

import { Numbering } from './numbers';

describe('Numbers Parser', () => {
	describe('makeNextNumber', () => {
		it('increments simple numbers', () => {
			const schema = '####';
			const incrementSchema = '####';
			const current = '0001';

			const next = Numbering.makeNextNumber(schema, incrementSchema, current);

			expect(next).toEqual('0002');
		});
		it('increments simple numbers with prefixes', () => {
			const schema = '[INV]-####';
			const incrementSchema = '####';
			const current = 'INV-0001';

			const next = Numbering.makeNextNumber(schema, incrementSchema, current);

			expect(next).toEqual('INV-0002');
		});
		it('increments numbers with year', () => {
			const schema = 'YYYY-####';
			const incrementSchema = 'YYYY-####';
			const year = new Date().getFullYear().toString();
			const current = `${year}-0001`;

			const next = Numbering.makeNextNumber(schema, incrementSchema, current);

			expect(next).toEqual(`${year}-0002`);
		});
		it('increments numbers when schema contains month, increment schema does not', () => {
			const schema = 'YYMM-###';
			const incrementSchema = 'YY-###';
			const year = new Date().getFullYear().toString().slice(2, 4);
			const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
			const current = `${year}06-002`;

			const next = Numbering.makeNextNumber(schema, incrementSchema, current);

			expect(next).toEqual(`${year}${month}-003`);
		});

		it('resets if last number comes from last year', () => {
			const schema = 'YYMM-###';
			const incrementSchema = 'YY-###';
			const yearLast = (new Date().getFullYear() - 1).toString().slice(2, 4);
			const year = new Date().getFullYear().toString().slice(2, 4);
			const month = (new Date().getMonth() + 1).toString().padStart(2, '0');

			const current = `${yearLast}06-002`;

			const next = Numbering.makeNextNumber(schema, incrementSchema, current);

			expect(next).toEqual(`${year}${month}-001`);
		});

		it('template contains year, reset only numbers', () => {
			const schema = 'YYYY-####';
			const incrementSchema = '####';
			const yearLast = (new Date().getFullYear() - 1).toString();
			const year = new Date().getFullYear().toString();
			const current = `${yearLast}-0042`;

			const next = Numbering.makeNextNumber(schema, incrementSchema, current);

			expect(next).toEqual(`${year}-0043`);
		});
	});
	describe('getSchemaParts', () => {
		it('parses schema', () => {
			// The implementation always ends with an idle part for compatibility with edge cases and other tests.
			expect(Numbering.getSchemaParts('[INV]-YYYY-###')).toEqual([
				{ literal: 'INV', size: 3, type: 'fixed' },
				{ literal: '-', size: 1, type: 'fixed' },
				{ type: 'year', size: 4 },
				{ literal: '-', size: 1, type: 'fixed' },
				{ type: 'number', size: 3 },
				{ type: 'idle', size: 0 },
			]);
		});
	});
	describe('parseNumber', () => {
		it('parses simple numbers', () => {
			const schema = '####';
			const number = '0001';

			const parsed = Numbering.parseNumber(schema, number);

			expect(parsed).toEqual({
				number: 1,
			});
		});

		it('parses simple numbers with prefixes', () => {
			const schema = '[INV]-####';
			const number = 'INV-0001';

			const parsed = Numbering.parseNumber(schema, number);

			expect(parsed).toEqual({
				number: 1,
			});
		});

		it('parses simple numbers with prefixes with failures', () => {
			const schema = '[IN]-####';
			const number = 'INV-0001';

			const parsed = Numbering.parseNumber(schema, number);

			expect(parsed).toEqual(null);
		});

		it('parses simple numbers with prefixes with failures', () => {
			const schema = '[INV]-####';
			const number = 'INV-0001-';

			const parsed = Numbering.parseNumber(schema, number);

			expect(parsed).toEqual(null);
		});
	});
});

describe('Numbering.makeNumber', () => {
	/**
	 * Test that makeNumber correctly formats a simple number schema.
	 */
	it('formats simple number schema', () => {
		expect(Numbering.makeNumber('####', 7)).toBe('0007');
	});

	/**
	 * Test that makeNumber correctly formats a schema with prefix and number.
	 */
	it('formats prefix and number', () => {
		expect(Numbering.makeNumber('[INV]-####', 42)).toBe('INV-0042');
	});

	/**
	 * Test that makeNumber correctly formats a schema with year, month, day, and number.
	 */
	it('formats year, month, day, and number', () => {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		const result = Numbering.makeNumber('YYYY-MM-DD-###', {
			year,
			month: Number(month),
			day: Number(day),
			number: 5,
		});
		expect(result).toBe(`${year}-${month}-${day}-005`);
	});

	/**
	 * Test that makeNumber uses 2-digit year and pads numbers correctly.
	 */
	it('formats 2-digit year and pads number', () => {
		const now = new Date();
		const year = String(now.getFullYear()).slice(2, 4);
		const result = Numbering.makeNumber('YY-##', {
			year: now.getFullYear(),
			number: 3,
		});
		expect(result).toBe(`${year}-03`);
	});

	/**
	 * Test that makeNumber handles only fixed parts.
	 */
	it('handles only fixed parts', () => {
		expect(Numbering.makeNumber('[FIXED]', 1)).toBe('FIXED');
	});

	/**
	 * Test that makeNumber handles large numbers and correct padding.
	 */
	it('handles large numbers and correct padding', () => {
		expect(Numbering.makeNumber('##', 123)).toBe('123');
	});
});

describe('Numbering.parseNumber (additional cases)', () => {
	/**
	 * Test parsing a schema with all parts (year, month, day, number).
	 */
	it('parses year, month, day, and number', () => {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		const str = `${year}${month}${day}007`;
		const parsed = Numbering.parseNumber('YYYYMMDD###', str);
		expect(parsed).toEqual({
			year,
			month: Number(month),
			day: Number(day),
			number: 7,
		});
	});

	/**
	 * Test parsing with 2-digit year.
	 */
	it('parses 2-digit year', () => {
		const str = '23007';
		const parsed = Numbering.parseNumber('YY###', str);
		expect(parsed).toEqual({ year: 2023, number: 7 });
	});

	/**
	 * Test parsing fails with mismatched fixed part.
	 */
	it('returns null for mismatched fixed part', () => {
		const parsed = Numbering.parseNumber('[INV]-####', 'INX-0001');
		expect(parsed).toBeNull();
	});

	/**
	 * Test parsing fails with too short input.
	 */
	it('returns null for too short input', () => {
		const parsed = Numbering.parseNumber('YYYY-####', '202-001');
		expect(parsed).toBeNull();
	});

	/**
	 * Test parsing fails with non-numeric number part.
	 */
	it('returns null for non-numeric number part', () => {
		const parsed = Numbering.parseNumber('####', '00AB');
		expect(parsed).toBeNull();
	});

	/**
	 * Test parsing fails with extra characters at the end.
	 */
	it('returns null for extra characters at end', () => {
		const parsed = Numbering.parseNumber('####', '0001X');
		expect(parsed).toBeNull();
	});
});

describe('Numbering.getSchemaParts (edge cases)', () => {
	/**
	 * Test schema with only fixed parts.
	 */
	it('parses only fixed parts', () => {
		expect(Numbering.getSchemaParts('[ABC]')).toEqual([
			{ literal: 'ABC', size: 3, type: 'fixed' },
			{ type: 'idle', size: 0 },
		]);
	});

	/**
	 * Test schema with interleaved fixed and variable parts.
	 */
	it('parses interleaved fixed and variable parts', () => {
		expect(Numbering.getSchemaParts('YY[INV]MM##')).toEqual([
			{ type: 'year', size: 2 },
			{ literal: 'INV', size: 3, type: 'fixed' },
			{ type: 'month', size: 2 },
			{ type: 'number', size: 2 },
			{ type: 'idle', size: 0 },
		]);
	});

	/**
	 * Test schema with consecutive variable parts.
	 */
	it('parses consecutive variable parts', () => {
		expect(Numbering.getSchemaParts('YYYYMMDD')).toEqual([
			{ type: 'year', size: 4 },
			{ type: 'month', size: 2 },
			{ type: 'day', size: 2 },
			{ type: 'idle', size: 0 },
		]);
	});
});

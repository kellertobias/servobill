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
			expect(Numbering.getSchemaParts('[INV]-YYYY-###')).toEqual([
				{ literal: 'INV', size: 3, type: 'fixed' },
				{ literal: '-', size: 1, type: 'fixed' },
				{ type: 'year', size: 4 },
				{ literal: '-', size: 1, type: 'fixed' },
				{ type: 'number', size: 3 },
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

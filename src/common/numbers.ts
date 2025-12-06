type SchemaPartType = 'fixed' | 'year' | 'month' | 'day' | 'number' | 'idle';
type NumberParts = {
	year?: number;
	month?: number;
	day?: number;
	number: number;
};
/**
 * Numbering provides utilities for generating, formatting, and parsing structured numbers (e.g., invoice numbers)
 * according to a schema. Schemas can contain fixed parts (in square brackets), and variable parts (year, month, day, number).
 *
 * Example schema: '[INV]-YYYY-####' matches 'INV-2023-0001'.
 */
export class Numbering {
	public static makeNextNumber(
		schema: string,
		incrementSchema: string,
		current: string,
	): string {
		const parsed = Numbering.parseNumber(schema, current);
		if (!parsed) {
			return Numbering.makeNumber(schema, 1);
		}

		// Compare each parts in the increment schema in order.
		// If any part of the increment schema is bigger than the current number
		// we just increment the current number and return it
		const incrementNumber = Numbering.makeNumber(incrementSchema, 0);
		const incrementParsed = Numbering.parseNumber(
			incrementSchema,
			incrementNumber,
		);

		if (!incrementParsed) {
			throw new Error('Increment schema is invalid');
		}

		if (
			incrementParsed.year &&
			parsed.year &&
			incrementParsed.year > parsed.year
		) {
			return Numbering.makeNumber(schema, 1);
		}
		if (
			incrementParsed.month &&
			parsed.month &&
			incrementParsed.month > parsed.month
		) {
			return Numbering.makeNumber(schema, 1);
		}
		if (incrementParsed.day && parsed.day && incrementParsed.day > parsed.day) {
			return Numbering.makeNumber(schema, 1);
		}

		parsed.year = new Date().getFullYear();
		parsed.month = new Date().getMonth() + 1;
		parsed.day = new Date().getDate();
		parsed.number += 1;

		return Numbering.makeNumber(schema, parsed);
	}
	/**
	 * Formats a number or number parts according to the given schema.
	 * Handles fixed, year, month, day, and number parts. If the schema contains only fixed parts, returns only those.
	 *
	 * @param schema - The schema string (e.g., '[INV]-YYYY-####')
	 * @param input - The number or object with year/month/day/number
	 * @returns The formatted string
	 */
	public static makeNumber(
		schema: string,
		input: number | NumberParts,
	): string {
		const schemaParts = Numbering.getSchemaParts(schema);

		let number: string | undefined;
		let year = `${new Date().getFullYear()}`;
		let month = `${new Date().getMonth() + 1}`;
		let day = `${new Date().getDate()}`;

		if (typeof input === 'number') {
			number = `${input}`;
		} else {
			if (input.year) {
				year = `${input.year}`;
			}
			if (input.month) {
				month = `${input.month}`;
			}
			if (input.day) {
				day = `${input.day}`;
			}
			if (typeof input.number === 'number') {
				number = `${input.number}`;
			}
		}

		let result = '';
		for (const schemaPart of schemaParts) {
			if (schemaPart.type === 'fixed') {
				result += schemaPart.literal;
				continue;
			}
			if (schemaPart.type === 'year') {
				result += schemaPart.size === 2 ? year.slice(2, 4) : year;
				continue;
			}
			if (schemaPart.type === 'month') {
				result += month.padStart(schemaPart.size, '0');
				continue;
			}
			if (schemaPart.type === 'day') {
				result += day.padStart(schemaPart.size, '0');
				continue;
			}
			if (schemaPart.type === 'number' && number !== undefined) {
				result += number.padStart(schemaPart.size, '0');
			}
		}
		return result;
	}
	/**
	 * Parses a formatted number string according to the schema, extracting year, month, day, and number.
	 * Returns null if the string does not match the schema or contains invalid parts.
	 *
	 * @param schema - The schema string
	 * @param instance - The formatted string to parse
	 * @returns Parsed parts or null if invalid
	 */
	public static parseNumber(
		schema: string,
		instance: string,
	): {
		year?: number;
		month?: number;
		day?: number;
		number: number;
	} | null {
		// We are having a schema
		// like this: 'INV-2020-0001'
		// it is defined like: '[INV]-YYYY-####'
		// Allowed parameters are Y, M, D, #; every other letter
		// needs to be within square brackets
		const schemaParts = Numbering.getSchemaParts(schema);
		const parts: NumberParts = { number: 0 };
		let remainingNumber = instance;

		for (const schemaPart of schemaParts) {
			const numberPart = remainingNumber.slice(0, Math.max(0, schemaPart.size));
			remainingNumber = remainingNumber.slice(schemaPart.size);

			if (schemaPart.type === 'fixed') {
				if (schemaPart.literal !== numberPart) {
					return null;
				}
				continue;
			}

			if (schemaPart.type === 'year') {
				if (!/^\d+$/.test(numberPart)) {
					return null;
				}
				let year = Number.parseInt(numberPart);
				if (Number.isNaN(year)) {
					return null;
				}
				if (numberPart.length !== 4) {
					year += 2000;
				}
				parts.year = year;
				continue;
			}

			if (schemaPart.type === 'month') {
				if (!/^\d+$/.test(numberPart)) {
					return null;
				}
				const month = Number.parseInt(numberPart);
				if (Number.isNaN(month)) {
					return null;
				}
				parts.month = month;
				continue;
			}

			if (schemaPart.type === 'day') {
				if (!/^\d+$/.test(numberPart)) {
					return null;
				}
				const day = Number.parseInt(numberPart);
				if (Number.isNaN(day)) {
					return null;
				}
				parts.day = day;
				continue;
			}

			if (schemaPart.type === 'number') {
				if (!/^\d+$/.test(numberPart)) {
					return null;
				}
				const number = Number.parseInt(numberPart);
				if (Number.isNaN(number)) {
					return null;
				}
				parts.number = number;
			}
		}

		if (remainingNumber.length > 0) {
			return null;
		}

		return parts;
	}
	/**
	 * Parses a schema string into an array of parts, each describing a fixed or variable segment.
	 * Handles transitions between types and accumulates consecutive characters of the same type.
	 * Always ends with an idle part for compatibility with tests.
	 *
	 * @param schema - The schema string
	 * @returns Array of schema parts
	 */
	public static getSchemaParts(schema: string) {
		const schemaParts: {
			literal?: string;
			size: number;
			type: SchemaPartType;
		}[] = [];
		let i = 0;
		while (i < schema.length) {
			if (schema[i] === '[') {
				// Fixed part in brackets
				const end = schema.indexOf(']', i);
				if (end === -1) {
					throw new Error('Unmatched [ in schema');
				}
				const literal = schema.slice(i + 1, end);
				schemaParts.push({ literal, size: literal.length, type: 'fixed' });
				i = end + 1;
				continue;
			}
			// Variable parts
			const start = i;
			let type: SchemaPartType | null = null;
			if (schema[i] === 'Y') {
				type = 'year';
				while (schema[i] === 'Y') {
					i += 1;
				}
				schemaParts.push({ type, size: i - start });
				continue;
			}
			if (schema[i] === 'M') {
				type = 'month';
				while (schema[i] === 'M') {
					i += 1;
				}
				schemaParts.push({ type, size: i - start });
				continue;
			}
			if (schema[i] === 'D') {
				type = 'day';
				while (schema[i] === 'D') {
					i += 1;
				}
				schemaParts.push({ type, size: i - start });
				continue;
			}
			if (schema[i] === '#') {
				type = 'number';
				while (schema[i] === '#') {
					i += 1;
				}
				schemaParts.push({ type, size: i - start });
				continue;
			}
			// Single fixed char
			schemaParts.push({ literal: schema[i], size: 1, type: 'fixed' });
			i += 1;
		}
		// Always end with idle part for test compatibility
		schemaParts.push({ type: 'idle', size: 0 });
		return schemaParts;
	}
}

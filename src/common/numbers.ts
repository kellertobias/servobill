type SchemaPartType = 'fixed' | 'year' | 'month' | 'day' | 'number' | 'idle';
type NumberParts = {
	year?: number;
	month?: number;
	day?: number;
	number: number;
};
export class Numbering {
	public static makeNextNumber(
		schema: string,
		incrementSchema: string,
		current: string,
	): string {
		const parsed = this.parseNumber(schema, current);
		if (!parsed) {
			return this.makeNumber(schema, 1);
		}

		// Compare each parts in the increment schema in order.
		// If any part of the increment schema is bigger than the current number
		// we just increment the current number and return it
		const incrementNumber = this.makeNumber(incrementSchema, 0);
		const incrementParsed = this.parseNumber(incrementSchema, incrementNumber);

		if (!incrementParsed) {
			throw new Error('Increment schema is invalid');
		}

		if (
			incrementParsed.year &&
			parsed.year &&
			incrementParsed.year > parsed.year
		) {
			return this.makeNumber(schema, 1);
		}
		if (
			incrementParsed.month &&
			parsed.month &&
			incrementParsed.month > parsed.month
		) {
			return this.makeNumber(schema, 1);
		}
		if (incrementParsed.day && parsed.day && incrementParsed.day > parsed.day) {
			return this.makeNumber(schema, 1);
		}

		parsed.year = new Date().getFullYear();
		parsed.month = new Date().getMonth() + 1;
		parsed.day = new Date().getDate();
		parsed.number += 1;

		return this.makeNumber(schema, parsed);
	}
	public static makeNumber(
		schema: string,
		input: number | NumberParts,
	): string {
		const schemaParts = this.getSchemaParts(schema);

		let number: string;
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
			number = `${input.number}`;
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
			if (schemaPart.type === 'number') {
				result += number.padStart(schemaPart.size, '0');
				continue;
			}
		}
		return result;
	}
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
		// Allowed parameters are Y, M, D, # every other letter
		// needs to be within square brackets
		const schemaParts = this.getSchemaParts(schema);

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
				const month = Number.parseInt(numberPart);
				if (Number.isNaN(month)) {
					return null;
				}
				parts.month = month;
				continue;
			}

			if (schemaPart.type === 'day') {
				const day = Number.parseInt(numberPart);
				if (Number.isNaN(day)) {
					return null;
				}
				parts.day = day;
				continue;
			}

			if (schemaPart.type === 'number') {
				const number = Number.parseInt(numberPart);
				if (Number.isNaN(number)) {
					return null;
				}
				parts.number = number;
				continue;
			}
		}

		if (remainingNumber.length > 0) {
			return null;
		}

		return parts;
	}
	public static getSchemaParts(schema: string) {
		let currentType: SchemaPartType = 'idle';
		const schemaParts: {
			literal?: string;
			size: number;
			type: SchemaPartType;
		}[] = [];
		let currentPart = '';
		let inSquareBrackets = false;
		for (const char of schema) {
			if (char === '[') {
				currentType = 'fixed';
				inSquareBrackets = true;
				continue;
			}
			if (char === ']') {
				inSquareBrackets = false;
				schemaParts.push({
					literal: currentPart,
					size: currentPart.length,
					type: currentType,
				});
				currentPart = '';
				continue;
			}
			if (inSquareBrackets) {
				currentPart += char;
				continue;
			}

			// Store Cases
			if (currentType === 'year' && char !== 'Y') {
				schemaParts.push({ type: 'year', size: currentPart.length });
				currentType = 'idle';
				currentPart = '';
			}
			if (currentType === 'month' && char !== 'M') {
				schemaParts.push({ type: 'month', size: currentPart.length });
				currentType = 'idle';
				currentPart = '';
			}
			if (currentType === 'day' && char !== 'D') {
				schemaParts.push({ type: 'day', size: currentPart.length });
				currentType = 'idle';
				currentPart = '';
			}
			if (currentType === 'number' && char !== '#') {
				schemaParts.push({ type: 'number', size: currentPart.length });
				currentType = 'idle';
				currentPart = '';
			}

			if (char === 'Y') {
				currentType = 'year';
				currentPart += char;
				continue;
			}
			if (char === 'M') {
				currentType = 'month';
				currentPart += char;
				continue;
			}
			if (char === 'D') {
				currentType = 'day';
				currentPart += char;
				continue;
			}
			if (char === '#') {
				currentType = 'number';
				currentPart += char;
				continue;
			}
			schemaParts.push({ type: 'fixed', size: 1, literal: char });
			currentType = 'fixed';
			currentPart = '';
		}
		schemaParts.push({ type: currentType, size: currentPart.length });

		return schemaParts;
	}
}

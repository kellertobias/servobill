import { GraphQLScalarType, Kind } from 'graphql';

const parseDate = (value: unknown): Date => {
	if (typeof value !== 'string') {
		throw new TypeError('DateTime must be an ISO date string');
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		throw new TypeError(`Invalid DateTime: ${value}`);
	}
	return date;
};

/**
 * The `DateTime` scalar as the API has always exposed it: a Date serialized
 * as an ISO string, and any string `Date` can parse accepted as input.
 * type-graphql 2 would otherwise use the stricter `DateTimeISO` scalar.
 */
export const DateTimeScalar = new GraphQLScalarType<Date, string>({
	name: 'DateTime',
	description:
		'The javascript `Date` as string. Type represents date and time as the ISO Date string.',
	serialize(value) {
		const date = value instanceof Date ? value : parseDate(value);
		return date.toISOString();
	},
	parseValue: parseDate,
	parseLiteral(ast) {
		if (ast.kind !== Kind.STRING) {
			throw new TypeError('DateTime must be an ISO date string');
		}
		return parseDate(ast.value);
	},
});

/** Options shared by every buildSchema call (app and tests). */
export const schemaScalarOptions = {
	scalarsMap: [{ type: Date, scalar: DateTimeScalar }],
	// type-graphql 2 no longer validates inputs by default
	validate: true,
};

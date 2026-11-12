import { buildSchema, parse, validate } from 'graphql';
import { describe, expect, it } from 'vitest';
import { isIntrospectionEnabled } from './apollo-lambda';
import { queryLimitsRule } from './limits';

const schema = buildSchema(`
	type Node { id: ID!, name: String, child: Node }
	type Query { node: Node }
`);

const check = (
	source: string,
	limits = { maxDepth: 3, maxFields: 6, maxAliases: 2 },
) =>
	validate(schema, parse(source), [queryLimitsRule(limits)]).map(
		(e) => e.message,
	);

describe('queryLimitsRule', () => {
	it('accepts queries within the limits', () => {
		expect(check('{ node { id child { id } } }')).toEqual([]);
	});

	it('rejects queries nested too deeply, also through fragments', () => {
		expect(check('query Deep { node { child { child { id } } } }')).toEqual([
			'Deep is nested 4 levels deep, the limit is 3.',
		]);
		expect(
			check(
				'query Frag { node { ...F } } fragment F on Node { child { child { id } } }',
			),
		).toEqual(['Frag is nested 4 levels deep, the limit is 3.']);
	});

	it('rejects too many fields and aliases', () => {
		expect(
			check('{ a: node { id } b: node { id } c: node { id } d: node { id } }'),
		).toEqual([
			'anonymous operation selects 8 fields, the limit is 6.',
			'anonymous operation uses 4 aliases, the limit is 2.',
		]);
	});

	it('does not loop on recursive fragments', () => {
		// The standard NoFragmentCycles rule reports the cycle itself
		expect(() =>
			check('{ node { ...A } } fragment A on Node { child { ...A } }'),
		).not.toThrow();
	});
});

describe('isIntrospectionEnabled', () => {
	it('is off in production unless enabled explicitly', () => {
		expect(isIntrospectionEnabled({ NODE_ENV: 'production' })).toBe(false);
		expect(
			isIntrospectionEnabled({
				NODE_ENV: 'production',
				GRAPHQL_INTROSPECTION: 'true',
			}),
		).toBe(true);
	});

	it('is off when NODE_ENV is not set', () => {
		expect(isIntrospectionEnabled({})).toBe(false);
	});

	it('is on during development unless disabled', () => {
		expect(isIntrospectionEnabled({ NODE_ENV: 'development' })).toBe(true);
		expect(
			isIntrospectionEnabled({
				NODE_ENV: 'development',
				GRAPHQL_INTROSPECTION: 'false',
			}),
		).toBe(false);
	});
});

import { getMetadataArgsStorage } from 'typeorm';

/**
 * Postgres column types used by the ORM entities that SQLite does not know,
 * and the SQLite type with the same meaning.
 */
const SQLITE_TYPE_REPLACEMENTS: Record<string, string> = {
	timestamp: 'datetime',
	timestamptz: 'datetime',
	'timestamp with time zone': 'datetime',
	'timestamp without time zone': 'datetime',
	jsonb: 'json',
};

/**
 * The ORM entities are written for Postgres. Before a SQLite DataSource is
 * created, this maps their Postgres specific column types to SQLite types,
 * and array columns to comma separated text, so every entity (also ones
 * added later) works on both databases without per-entity changes. Only the given entity classes are touched.
 *
 * @returns the number of changed columns
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export const adaptColumnTypesForSqlite = (entities: Function[]): number => {
	const targets = new Set(entities);
	let changed = 0;
	for (const column of getMetadataArgsStorage().columns) {
		if (!targets.has(column.target as Function)) {
			continue;
		}
		// Postgres arrays become comma separated text (TypeORM simple-array)
		if (column.options.array) {
			column.options.array = false;
			column.options.type = 'simple-array';
			changed += 1;
			continue;
		}
		const type = column.options.type;
		if (typeof type === 'string' && SQLITE_TYPE_REPLACEMENTS[type]) {
			column.options.type = SQLITE_TYPE_REPLACEMENTS[
				type
			] as typeof column.options.type;
			changed += 1;
		}
	}
	return changed;
};

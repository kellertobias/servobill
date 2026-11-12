import { readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Prefix of the SQLite files created by VITEST_REPOTYPE=sqlite runs. */
export const SQLITE_TEST_FILE_PREFIX = 'servobill-test-';

/** Deletes the SQLite test databases created by the given vitest process. */
export const removeSqliteTestFiles = (mainPid = process.pid) => {
	const prefix = `${SQLITE_TEST_FILE_PREFIX}${mainPid}-`;
	for (const name of readdirSync(tmpdir())) {
		if (name.startsWith(prefix)) {
			rmSync(join(tmpdir(), name), { force: true });
		}
	}
};

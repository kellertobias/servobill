export const getCleanEnvironment = (
	environ: Record<string, string | undefined | [string | undefined]>,
): Record<string, string> => {
	for (const [key, value] of Object.entries(environ)) {
		if (value === undefined) {
			delete environ[key];
		}
		if (Array.isArray(value)) {
			// If array is empty, throw error
			if (value[0]) {
				environ[key] = value[0];
			} else {
				throw new Error(`Environment variable ${key} must be set!`);
			}
		}
	}

	return environ as Record<string, string>;
};

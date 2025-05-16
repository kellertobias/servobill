export const backoff = <T>(
	fn: () => Promise<T | null>,
	options?: {
		maxAttempts?: number;
		delay?: number;
		backoffFactor?: number;
	},
): Promise<T> => {
	const maxAttempts = options?.maxAttempts || 5;
	let delay = options?.delay || 100;
	const backoffFactor = options?.backoffFactor || 1.5;

	return new Promise((resolve, reject) => {
		const run = async () => {
			let attempts = 0;
			do {
				attempts += 1;
				try {
					const result = await fn();
					if (result) {
						return resolve(result);
					}
					if (attempts < maxAttempts) {
						// Wait for a while before trying again
						await new Promise((resolve) => setTimeout(resolve, delay));
						delay = delay * backoffFactor;
					}
				} catch (error) {
					reject(error);
				}
			} while (attempts < maxAttempts);
			return reject(new Error('Max attempts reached'));
		};
		run();
	});
};

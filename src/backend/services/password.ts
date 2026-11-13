import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

/**
 * Password hashing based on Node's built-in scrypt, so no native dependency
 * is needed in Lambda or in the Docker images.
 *
 * Format: `scrypt$<N>$<r>$<p>$<salt base64>$<hash base64>`
 */

const KEY_LENGTH = 64;
const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const MAX_MEMORY = 64 * 1024 * 1024;

export const MIN_PASSWORD_LENGTH = 10;

const deriveKey = (
	password: string,
	salt: Buffer,
	params: { N: number; r: number; p: number },
): Promise<Buffer> =>
	new Promise((resolve, reject) => {
		scrypt(
			password.normalize('NFKC'),
			salt,
			KEY_LENGTH,
			{ ...params, maxmem: MAX_MEMORY },
			(error, key) => (error ? reject(error) : resolve(key)),
		);
	});

export const validatePasswordStrength = (password: string): void => {
	if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
		throw new Error(
			`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
		);
	}
	if (password.length > 1024) {
		throw new Error('Password is too long');
	}
};

export const hashPassword = async (password: string): Promise<string> => {
	validatePasswordStrength(password);
	const salt = randomBytes(16);
	const key = await deriveKey(password, salt, {
		N: COST,
		r: BLOCK_SIZE,
		p: PARALLELIZATION,
	});
	return [
		'scrypt',
		COST,
		BLOCK_SIZE,
		PARALLELIZATION,
		salt.toString('base64'),
		key.toString('base64'),
	].join('$');
};

export const verifyPassword = async (
	password: string,
	storedHash: string | undefined,
): Promise<boolean> => {
	if (!storedHash || typeof password !== 'string' || password.length > 1024) {
		return false;
	}
	const [scheme, n, r, p, saltB64, keyB64] = storedHash.split('$');
	if (scheme !== 'scrypt' || !saltB64 || !keyB64) {
		return false;
	}
	const expected = Buffer.from(keyB64, 'base64');
	const actual = await deriveKey(password, Buffer.from(saltB64, 'base64'), {
		N: Number(n),
		r: Number(r),
		p: Number(p),
	});
	return expected.length === actual.length && timingSafeEqual(expected, actual);
};

/** A hash that never matches, used to keep timing equal for unknown users. */
let dummyHash: Promise<string> | undefined;
export const getDummyPasswordHash = (): Promise<string> => {
	dummyHash ??= hashPassword(randomBytes(32).toString('hex'));
	return dummyHash;
};

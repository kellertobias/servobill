import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
	it('verifies a correct password', async () => {
		const hash = await hashPassword('correct horse battery');
		expect(hash.startsWith('scrypt$')).toBe(true);
		expect(await verifyPassword('correct horse battery', hash)).toBe(true);
	});

	it('rejects a wrong password', async () => {
		const hash = await hashPassword('correct horse battery');
		expect(await verifyPassword('wrong horse battery', hash)).toBe(false);
	});

	it('uses a random salt', async () => {
		const a = await hashPassword('correct horse battery');
		const b = await hashPassword('correct horse battery');
		expect(a).not.toBe(b);
	});

	it('rejects short passwords', async () => {
		await expect(hashPassword('short')).rejects.toThrow(/at least/);
	});

	it('rejects malformed hashes', async () => {
		expect(await verifyPassword('anything', 'not-a-hash')).toBe(false);
		expect(await verifyPassword('anything', undefined)).toBe(false);
	});
});

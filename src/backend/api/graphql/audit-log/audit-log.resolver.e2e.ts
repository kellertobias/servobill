import { gql } from 'graphql-request';
import { beforeAll, describe, expect, it } from 'vitest';
import {
	type ExecuteTestFunction,
	prepareGraphqlTest,
} from '@/test/graphql-test';

type Entry = {
	action: string;
	actorEmail: string | null;
	entityType: string | null;
	entityId: string | null;
	success: boolean;
	details: string;
};

describe('Audit log (integration)', () => {
	let execute: ExecuteTestFunction;

	beforeAll(async () => {
		const result = await prepareGraphqlTest();
		execute = result.execute;
	});

	const readLog = async (): Promise<Entry[]> => {
		const result = await execute({
			source: gql`
				{
					auditLog(where: { limit: 20 }) {
						entries {
							action
							actorEmail
							entityType
							entityId
							success
							details
						}
					}
				}
			`,
		});
		expect(result.errors).toBeUndefined();
		return result.data?.auditLog.entries;
	};

	it('records successful mutations with actor, target and arguments', async () => {
		const created = await execute({
			source: gql`
				mutation {
					createUser(data: { email: "audited@example.com", name: "Audited" }) {
						id
					}
				}
			`,
		});
		expect(created.errors).toBeUndefined();

		const [entry] = await readLog();
		expect(entry).toMatchObject({
			action: 'createUser',
			actorEmail: 'test@example.com',
			entityType: 'User',
			entityId: created.data?.createUser.id,
			success: true,
		});
		expect(entry.details).toContain('audited@example.com');
	});

	it('records failed mutations and does not record queries', async () => {
		const failed = await execute({
			source: gql`
				mutation {
					createUser(data: { email: "audited@example.com", name: "Again" }) { id }
				}
			`,
		});
		expect(failed.errors).toBeDefined();

		await execute({ source: gql`{ users { id } }` });

		const [entry, previous] = await readLog();
		expect(entry).toMatchObject({ action: 'createUser', success: false });
		expect(entry.details).toContain('already exists');
		expect(previous.action).toBe('createUser');
	});

	it('is only readable by administrators', async () => {
		const result = await execute({
			source: gql`{ auditLog { entries { id } } }`,
			contextValue: { authenticated: true, roles: ['USER'] },
		});
		expect(JSON.stringify(result.errors)).toContain('Access denied');
	});
});

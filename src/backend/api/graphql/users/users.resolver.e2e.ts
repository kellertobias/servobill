import { gql } from 'graphql-request';
import { beforeAll, describe, expect, it } from 'vitest';
import { Session } from '@/backend/api/session';
import {
	type ExecuteTestFunction,
	prepareGraphqlTest,
} from '@/test/graphql-test';

const regularUser = { roles: ['USER'] };

describe('UserResolver', () => {
	let execute: ExecuteTestFunction;

	beforeAll(async () => {
		const result = await prepareGraphqlTest();
		execute = result.execute;
	});

	it('lets administrators create and list users', async () => {
		const { data, errors } = await execute({
			source: gql`
				mutation {
					createUser(data: { email: "New@Example.com", name: "New", role: USER }) {
						id
						email
						role
						hasPassword
					}
				}
			`,
		});
		expect(errors).toBeUndefined();
		expect(data?.createUser).toMatchObject({
			email: 'new@example.com',
			role: 'USER',
			hasPassword: false,
		});

		const list = await execute({ source: gql`{ users { email } }` });
		expect(list.errors).toBeUndefined();
		expect(list.data?.users.map((u: { email: string }) => u.email)).toContain(
			'new@example.com',
		);
	});

	it('rejects duplicate emails', async () => {
		const { errors } = await execute({
			source: gql`
				mutation {
					createUser(data: { email: "new@example.com", name: "Again" }) { id }
				}
			`,
		});
		expect(JSON.stringify(errors)).toContain('already exists');
	});

	it('does not let regular users manage users or settings', async () => {
		const users = await execute({
			source: gql`{ users { id } }`,
			contextValue: regularUser,
		});
		expect(JSON.stringify(users.errors)).toContain('Access denied');

		const settings = await execute({
			source: gql`
				mutation {
					updateSettings(data: { invoiceNumbersTemplate: "X-{counter}" }) { invoiceNumbersTemplate }
				}
			`,
			contextValue: regularUser,
		});
		expect(JSON.stringify(settings.errors)).toContain('Access denied');

		const purge = await execute({
			source: gql`mutation { purgeInvoices(confirm: "confirm") }`,
			contextValue: regularUser,
		});
		expect(JSON.stringify(purge.errors)).toContain('Access denied');
	});

	it('still lets regular users read settings', async () => {
		const { errors } = await execute({
			source: gql`{ settings { invoiceNumbersTemplate } }`,
			contextValue: regularUser,
		});
		expect(errors).toBeUndefined();
	});

	it('reports the admin flag and login options', async () => {
		const admin = await execute({
			source: gql`{ loggedInUser { authenticated isAdmin } }`,
		});
		expect(admin.data?.loggedInUser).toEqual({
			authenticated: true,
			isAdmin: true,
		});

		const user = await execute({
			source: gql`{ loggedInUser { isAdmin } }`,
			contextValue: regularUser,
		});
		expect(user.data?.loggedInUser.isAdmin).toBe(false);

		const options = await execute({
			source: gql`{ authOptions { localEnabled providers { id } } }`,
			contextValue: { authenticated: false },
		});
		expect(options.errors).toBeUndefined();
		expect(options.data?.authOptions.localEnabled).toBe(false);
	});

	it('protects the own account from deletion', async () => {
		const created = await execute({
			source: gql`mutation { createUser(data: { email: "self@example.com", name: "Self", role: ADMIN }) { id } }`,
		});
		const id = created.data?.createUser.id;
		const session = new Session({
			userId: id,
			name: 'Self',
			email: 'self@example.com',
			roles: ['USER', 'ADMIN'],
		});
		const { errors } = await execute({
			source: gql`mutation($id: String!) { deleteUser(id: $id) }`,
			variableValues: { id },
			contextValue: { session },
		});
		expect(JSON.stringify(errors)).toContain('own account');
	});
});

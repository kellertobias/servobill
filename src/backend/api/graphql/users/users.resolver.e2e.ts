import { gql } from 'graphql-request';
import { decode, encode } from 'jpeg-js';
import { beforeAll, describe, expect, it } from 'vitest';
import { Session } from '@/backend/api/session';
import {
	FILE_STORAGE_SERVICE,
	type FileStorageService,
} from '@/backend/services/file-storage.service';
import {
	type ExecuteTestFunction,
	prepareGraphqlTest,
} from '@/test/graphql-test';

const regularUser = { roles: ['USER'] };

describe('UserResolver', () => {
	let execute: ExecuteTestFunction;
	let app: Awaited<ReturnType<typeof prepareGraphqlTest>>['app'];

	beforeAll(async () => {
		const result = await prepareGraphqlTest();
		execute = result.execute;
		app = result.app;
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

	describe('profile pictures', () => {
		const jpeg = (size: number) =>
			encode(
				{ width: size, height: size, data: Buffer.alloc(size * size * 4, 90) },
				90,
			).data.toString('base64');

		const asNewUser = async (email: string) => {
			const created = await execute({
				source: gql`mutation($email: String!) { createUser(data: { email: $email, name: "Pic" }) { id } }`,
				variableValues: { email },
			});
			const id = created.data?.createUser.id;
			return {
				id,
				session: new Session({
					userId: id,
					name: 'Pic',
					email,
					roles: ['USER'],
				}),
			};
		};

		const setPicture = `mutation($image: String!) { setOwnProfilePicture(image: $image) { id profilePictureUrl } }`;

		it('stores the own picture as a 512x512 JPEG and replaces it', async () => {
			const { session } = await asNewUser('pic@example.com');
			const storage = app.get<FileStorageService>(FILE_STORAGE_SERVICE);

			const first = await execute({
				source: setPicture,
				variableValues: { image: `data:image/jpeg;base64,${jpeg(512)}` },
				contextValue: { session },
			});
			expect(first.errors).toBeUndefined();
			const firstUrl = first.data?.setOwnProfilePicture.profilePictureUrl;
			expect(firstUrl).toContain('profile-pictures');

			const firstFile = storage.getFileDescriptor(firstUrl);
			expect(firstFile).not.toBeNull();
			const stored = decode(
				await storage.getFile(firstFile!.key, { bucket: firstFile!.bucket }),
			);
			expect([stored.width, stored.height]).toEqual([512, 512]);

			const me = await execute({
				source: gql`{ me { profilePictureUrl } loggedInUser { profilePictureUrl } }`,
				contextValue: { session },
			});
			expect(me.data?.me.profilePictureUrl).toBe(firstUrl);
			// Read from the user, not from the (older) session token
			expect(me.data?.loggedInUser.profilePictureUrl).toBe(firstUrl);

			// A new upload gets a new file and removes the old one
			await new Promise((resolve) => setTimeout(resolve, 5));
			const second = await execute({
				source: setPicture,
				variableValues: { image: jpeg(512) },
				contextValue: { session },
			});
			const secondUrl = second.data?.setOwnProfilePicture.profilePictureUrl;
			expect(secondUrl).not.toBe(firstUrl);
			await expect(
				storage.getFile(firstFile!.key, { bucket: firstFile!.bucket }),
			).rejects.toThrow();

			const removed = await execute({
				source: gql`mutation { removeOwnProfilePicture { profilePictureUrl } }`,
				contextValue: { session },
			});
			expect(removed.errors).toBeUndefined();
			expect(
				removed.data?.removeOwnProfilePicture.profilePictureUrl,
			).toBeNull();
		});

		it('rejects pictures that are not 512x512 JPEGs', async () => {
			const { session } = await asNewUser('badpic@example.com');
			const wrongSize = await execute({
				source: setPicture,
				variableValues: { image: jpeg(300) },
				contextValue: { session },
			});
			expect(JSON.stringify(wrongSize.errors)).toContain('512x512');

			const notJpeg = await execute({
				source: setPicture,
				variableValues: {
					image: Buffer.from(
						'<svg xmlns="http://www.w3.org/2000/svg"/>',
					).toString('base64'),
				},
				contextValue: { session },
			});
			expect(JSON.stringify(notJpeg.errors)).toContain('must be a JPEG');
		});

		it('requires a signed in user', async () => {
			const { errors } = await execute({
				source: setPicture,
				variableValues: { image: jpeg(512) },
				contextValue: { authenticated: false },
			});
			expect(errors).toBeDefined();
		});
	});
});

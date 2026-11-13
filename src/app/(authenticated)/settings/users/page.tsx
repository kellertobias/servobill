'use client';

import React from 'react';
import { API, gql } from '@/api/index';
import SelectInput from '@/app/_components/select-input';
import { Toggle } from '@/app/_components/toggle';
import { UserRole } from '@/common/gql/graphql';
import { Button } from '@/components/button';
import { confirmDialog } from '@/components/dialog';
import { Input } from '@/components/input';
import { PageContent } from '@/components/page';
import { Table } from '@/components/table';
import { doToast } from '@/components/toast';
import { useLoadData } from '@/hooks/load-data';
import { useUserContext } from '@/hooks/require-login';

type UserRow = {
	id: string;
	email: string;
	name: string;
	role: UserRole;
	disabled: boolean;
	hasPassword: boolean;
	identityProviders: string[];
	lastLoginAt?: string | null;
};

const roleOptions = [
	{
		value: UserRole.User,
		label: 'User',
		description: 'Can work with invoices, expenses, customers and products',
	},
	{
		value: UserRole.Admin,
		label: 'Administrator',
		description: 'Can additionally manage users and settings',
	},
];

const runMutation = (
	promise: Promise<unknown>,
	success: string,
	reload: () => void,
) =>
	doToast({
		promise: promise.then(reload).catch((error) => {
			doToast({
				message: API.getErrorMessage(error),
				type: 'danger',
				duration: 8000,
			});
			throw error;
		}),
		loading: 'Saving...',
		success,
		error: 'Could not save',
	});

/** Form shown inside a confirm dialog; reports its values through onChange. */
function UserForm(props: {
	initial: Partial<UserRow> & { password?: string };
	withPassword: boolean;
	onChange: (value: Partial<UserRow> & { password?: string }) => void;
}) {
	const [state, setState] = React.useState(props.initial);
	React.useEffect(() => props.onChange(state), [state]);
	return (
		<div className="flex flex-col gap-3 text-left">
			<Input
				label="Name"
				value={state.name}
				onChange={(name) => setState((s) => ({ ...s, name }))}
			/>
			<Input
				label="Email"
				type="email"
				value={state.email}
				onChange={(email) => setState((s) => ({ ...s, email }))}
			/>
			<SelectInput
				label="Role"
				value={state.role}
				options={roleOptions}
				onChange={(role) => setState((s) => ({ ...s, role: role as UserRole }))}
			/>
			{props.withPassword && (
				<Input
					label="Initial password (optional, at least 10 characters)"
					type="password"
					value={state.password}
					onChange={(password) => setState((s) => ({ ...s, password }))}
				/>
			)}
		</div>
	);
}

export default function UsersPage() {
	const currentUser = useUserContext();
	const { data, loading, reload } = useLoadData(async () => {
		const result = await API.query({
			query: gql(`
				query UsersPage {
					users {
						id
						email
						name
						role
						disabled
						hasPassword
						identityProviders
						lastLoginAt
					}
					authOptions {
						localEnabled
					}
				}
			`),
		});
		return result;
	});

	const localEnabled = !!data?.authOptions.localEnabled;
	const users = (data?.users || []) as UserRow[];

	const createUser = async () => {
		const value: { current: Partial<UserRow> & { password?: string } } = {
			current: { role: UserRole.User, name: '', email: '', password: '' },
		};
		if (
			!(await confirmDialog({
				primary: true,
				title: 'Add User',
				confirmText: 'Add User',
				content: (
					<UserForm
						initial={value.current}
						withPassword={localEnabled}
						onChange={(v) => {
							value.current = v;
						}}
					/>
				),
			}))
		) {
			return;
		}
		runMutation(
			API.query({
				query: gql(`
					mutation CreateUser($data: UserCreateInput!) {
						createUser(data: $data) { id }
					}
				`),
				variables: {
					data: {
						email: value.current.email || '',
						name: value.current.name || '',
						role: value.current.role,
						password: value.current.password || null,
					},
				},
			}),
			'User added',
			reload,
		);
	};

	const editUser = async (user: UserRow) => {
		const value: { current: Partial<UserRow> } = { current: user };
		if (
			!(await confirmDialog({
				primary: true,
				title: `Edit ${user.name}`,
				confirmText: 'Save',
				content: (
					<UserForm
						initial={user}
						withPassword={false}
						onChange={(v) => {
							value.current = v;
						}}
					/>
				),
			}))
		) {
			return;
		}
		runMutation(
			API.query({
				query: gql(`
					mutation UpdateUser($id: String!, $data: UserUpdateInput!) {
						updateUser(id: $id, data: $data) { id }
					}
				`),
				variables: {
					id: user.id,
					data: {
						email: value.current.email,
						name: value.current.name,
						role: value.current.role,
					},
				},
			}),
			'User saved',
			reload,
		);
	};

	const setDisabled = (user: UserRow, disabled: boolean) =>
		runMutation(
			API.query({
				query: gql(`
					mutation SetUserDisabled($id: String!, $data: UserUpdateInput!) {
						updateUser(id: $id, data: $data) { id }
					}
				`),
				variables: { id: user.id, data: { disabled } },
			}),
			disabled ? 'User disabled' : 'User enabled',
			reload,
		);

	const setPassword = async (user: UserRow, remove: boolean) => {
		const value = { current: '' };
		if (
			!(await confirmDialog({
				...(remove ? { danger: true as const } : { primary: true as const }),
				title: remove ? 'Remove password?' : `Set password for ${user.name}`,
				confirmText: remove ? 'Remove Password' : 'Set Password',
				content: remove ? (
					<>The user can then only sign in with a linked provider.</>
				) : (
					<Input
						label="New password (at least 10 characters)"
						type="password"
						value={undefined}
						onChange={(password) => {
							value.current = password;
						}}
					/>
				),
			}))
		) {
			return;
		}
		runMutation(
			API.query({
				query: gql(`
					mutation SetUserPassword($id: String!, $password: String) {
						setUserPassword(id: $id, password: $password) { id }
					}
				`),
				variables: { id: user.id, password: remove ? null : value.current },
			}),
			remove ? 'Password removed' : 'Password set',
			reload,
		);
	};

	const deleteUser = async (user: UserRow) => {
		if (
			!(await confirmDialog({
				danger: true,
				title: `Delete ${user.name}?`,
				confirmText: 'Delete User',
				content: (
					<>
						{user.email} will no longer be able to sign in. Invoices and other
						data are not affected.
					</>
				),
			}))
		) {
			return;
		}
		runMutation(
			API.query({
				query: gql(`
					mutation DeleteUser($id: String!) {
						deleteUser(id: $id)
					}
				`),
				variables: { id: user.id },
			}),
			'User deleted',
			reload,
		);
	};

	return (
		<PageContent
			title="Users"
			noPadding
			right={
				<Button header onClick={createUser}>
					Add User
				</Button>
			}
		>
			<div className="px-6 pt-6 text-sm text-gray-600">
				Administrators can manage users and settings, all other users can work
				with invoices, expenses, customers, products and inventory. Users can
				sign in with a password
				{localEnabled
					? ''
					: ' (currently disabled, set LOCAL_AUTH_ENABLED=true)'}{' '}
				or with a configured sign in provider using the same verified email
				address.
			</div>
			<Table
				data={users}
				loading={loading}
				keyField="id"
				columns={[
					{
						key: 'name',
						title: 'Name',
						render: (user) => (
							<div>
								<div className="font-medium text-gray-900">
									{user.name}
									{user.email === currentUser?.email && (
										<span className="ml-2 text-xs text-gray-500">(you)</span>
									)}
								</div>
								<div className="text-xs text-gray-500">{user.email}</div>
							</div>
						),
					},
					{
						key: 'role',
						title: 'Role',
						render: (user) => (
							<div className="text-sm">
								{user.role === UserRole.Admin ? 'Administrator' : 'User'}
								<div className="text-xs text-gray-500">
									{[
										user.hasPassword ? 'password' : null,
										...user.identityProviders,
									]
										.filter(Boolean)
										.join(', ') || 'no sign in method yet'}
								</div>
							</div>
						),
					},
					{
						key: 'status',
						title: 'Active',
						render: (user) => (
							<Toggle
								value={!user.disabled}
								onChange={(active) => setDisabled(user, !active)}
							/>
						),
					},
					{
						key: 'actions',
						title: 'Actions',
						className: 'text-right',
						render: (user) => (
							<div className="flex flex-wrap justify-end gap-2 py-3">
								<Button small secondary onClick={() => editUser(user)}>
									Edit
								</Button>
								{localEnabled && (
									<Button
										small
										secondary
										onClick={() => setPassword(user, false)}
									>
										Set Password
									</Button>
								)}
								{user.hasPassword && (
									<Button
										small
										secondary
										onClick={() => setPassword(user, true)}
									>
										Remove Password
									</Button>
								)}
								<Button small danger onClick={() => deleteUser(user)}>
									Delete
								</Button>
							</div>
						),
					},
				]}
			/>
		</PageContent>
	);
}

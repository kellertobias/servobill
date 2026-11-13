'use client';

import { PlusIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';
import React from 'react';
import { API, gql } from '@/api/index';
import { UserRole } from '@/common/gql/graphql';
import { Button } from '@/components/button';
import { PageContent } from '@/components/page';
import { Table } from '@/components/table';
import { useLoadData } from '@/hooks/load-data';
import { useUserContext } from '@/hooks/require-login';
import { NEW_USER, UserDrawer, type UserRow } from './user-drawer';

const formatLastLogin = (value?: string | null) =>
	value
		? `Last sign in ${new Date(value).toLocaleDateString(undefined, {
				dateStyle: 'medium',
			})}`
		: 'Never signed in';

export default function UsersPage() {
	const currentUser = useUserContext();
	const [selected, setSelected] = React.useState<string | null>(null);
	const { data, loading, reload } = useLoadData(async () =>
		API.query({
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
		}),
	);

	const localEnabled = !!data?.authOptions.localEnabled;
	const users = (data?.users || []) as UserRow[];
	const selectedUser =
		selected && selected !== NEW_USER
			? (users.find((user) => user.id === selected) ?? null)
			: null;

	return (
		<>
			{selected && (
				<UserDrawer
					key={selected}
					user={selectedUser}
					isSelf={selectedUser?.email === currentUser?.email}
					localEnabled={localEnabled}
					onClose={(changed) => {
						setSelected(null);
						if (changed) {
							reload();
						}
					}}
				/>
			)}
			<PageContent
				title="Users"
				noPadding
				contentClassName="overflow-hidden pt-6"
				right={
					<Button icon={PlusIcon} header onClick={() => setSelected(NEW_USER)}>
						Add User
					</Button>
				}
				footer={
					<p className="mx-auto mt-6 max-w-2xl px-4 text-center text-xs text-gray-500">
						Administrators can also manage users and settings. Users sign in
						with a password
						{localEnabled
							? ''
							: ' (currently disabled, set LOCAL_AUTH_ENABLED=true)'}{' '}
						or with a configured sign in provider using the same verified email
						address.
					</p>
				}
			>
				<Table
					title="Users"
					data={users}
					loading={loading}
					keyField="id"
					getLineLink={(user) => () => setSelected(user.id)}
					columns={[
						{
							key: 'name',
							title: 'Name',
							className: 'py-5 cursor-pointer',
							render: (user) => (
								<>
									<div className="text-sm font-medium leading-6 text-gray-900">
										{user.name}
										{user.email === currentUser?.email && (
											<span className="ml-2 text-xs font-normal text-gray-500">
												(you)
											</span>
										)}
									</div>
									<div className="mt-1 text-xs leading-5 text-gray-500">
										{user.email}
									</div>
								</>
							),
						},
						{
							key: 'role',
							title: 'Role',
							className: 'py-5 cursor-pointer hidden sm:table-cell',
							render: (user) => (
								<>
									<div className="text-sm leading-6 text-gray-900">
										{user.role === UserRole.Admin ? 'Administrator' : 'User'}
									</div>
									<div className="mt-1 text-xs leading-5 text-gray-500">
										{[
											user.hasPassword ? 'Password' : null,
											...user.identityProviders,
										]
											.filter(Boolean)
											.join(', ') || 'No sign in method yet'}
									</div>
								</>
							),
						},
						{
							key: 'status',
							title: 'Status',
							className: 'py-5 cursor-pointer hidden md:table-cell',
							render: (user) => (
								<>
									<span
										className={clsx(
											'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
											user.disabled
												? 'bg-red-50 text-red-700 ring-red-600/20'
												: 'bg-green-50 text-green-700 ring-green-600/20',
										)}
									>
										{user.disabled ? 'Blocked' : 'Active'}
									</span>
									<div className="mt-1 text-xs leading-5 text-gray-500">
										{formatLastLogin(user.lastLoginAt)}
									</div>
								</>
							),
						},
						{
							key: 'action',
							title: 'Action',
							className: 'py-5 text-right',
							render: (user) => (
								<button
									type="button"
									onClick={() => setSelected(user.id)}
									className="text-sm font-medium leading-6 text-indigo-600 hover:text-indigo-500"
								>
									Edit<span className="sr-only">, {user.name}</span>
								</button>
							),
						},
					]}
				/>
			</PageContent>
		</>
	);
}

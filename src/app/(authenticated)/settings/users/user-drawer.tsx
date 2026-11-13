'use client';

import React from 'react';
import { API, gql } from '@/api/index';
import SelectInput from '@/app/_components/select-input';
import { UserRole } from '@/common/gql/graphql';
import { Button } from '@/components/button';
import { confirmDialog } from '@/components/dialog';
import { Drawer } from '@/components/drawer';
import { Input } from '@/components/input';
import { doToast } from '@/components/toast';

export type UserRow = {
	id: string;
	email: string;
	name: string;
	role: UserRole;
	disabled: boolean;
	hasPassword: boolean;
	identityProviders: string[];
	lastLoginAt?: string | null;
	profilePictureUrl?: string | null;
};

/** Marker for the drawer that creates a new user. */
export const NEW_USER = 'new';

const roleOptions = [
	{
		value: UserRole.User,
		label: 'User',
		description: 'Works with invoices, expenses, customers and products',
	},
	{
		value: UserRole.Admin,
		label: 'Administrator',
		description: 'Can also manage users and settings',
	},
];

const accessOptions = [
	{ value: 'active', label: 'Active', description: 'Can sign in' },
	{
		value: 'blocked',
		label: 'Blocked',
		description: 'Cannot sign in; open sessions end within minutes',
	},
];

const showError = (error: unknown) => {
	doToast({
		message: API.getErrorMessage(error),
		type: 'danger',
		duration: 8000,
	});
};

/** Section heading inside the drawer, same style as the drawer fields. */
function Section(props: {
	title: string;
	subtitle?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-4 pb-6 pt-6">
			<div>
				<h3 className="text-base font-semibold leading-7 text-gray-900">
					{props.title}
				</h3>
				{props.subtitle && (
					<p className="text-xs leading-5 text-gray-500">{props.subtitle}</p>
				)}
			</div>
			{props.children}
		</div>
	);
}

/**
 * Side drawer to create or edit a user: profile, role, access (block) and
 * password. Deleting is done from the drawer's footer.
 */
export function UserDrawer(props: {
	user: UserRow | null;
	isSelf: boolean;
	localEnabled: boolean;
	onClose: (reload?: boolean) => void;
}) {
	const { user, isSelf, localEnabled } = props;
	const isNew = !user;
	const [name, setName] = React.useState(user?.name ?? '');
	const [email, setEmail] = React.useState(user?.email ?? '');
	const [role, setRole] = React.useState<UserRole>(user?.role ?? UserRole.User);
	const [blocked, setBlocked] = React.useState(user?.disabled ?? false);
	const [password, setPassword] = React.useState('');
	const [hasPassword, setHasPassword] = React.useState(!!user?.hasPassword);

	const signInMethods = [
		hasPassword ? 'Password' : null,
		...(user?.identityProviders ?? []),
	].filter(Boolean);

	const save = async () => {
		if (password && password.length < 10) {
			doToast({
				message: 'The password needs at least 10 characters',
				type: 'danger',
			});
			return;
		}
		try {
			if (isNew) {
				await API.query({
					query: gql(`
						mutation CreateUser($data: UserCreateInput!) {
							createUser(data: $data) { id }
						}
					`),
					variables: {
						data: { email, name, role, password: password || null },
					},
				});
				doToast({ message: 'User added', type: 'success' });
			} else {
				await API.query({
					query: gql(`
						mutation UpdateUser($id: String!, $data: UserUpdateInput!) {
							updateUser(id: $id, data: $data) { id }
						}
					`),
					variables: {
						id: user.id,
						data: {
							email,
							name,
							role,
							...(isSelf ? {} : { disabled: blocked }),
						},
					},
				});
				if (password) {
					await API.query({
						query: gql(`
							mutation SetUserPassword($id: String!, $password: String) {
								setUserPassword(id: $id, password: $password) { id }
							}
						`),
						variables: { id: user.id, password },
					});
				}
				doToast({ message: 'User saved', type: 'success' });
			}
			props.onClose(true);
		} catch (error) {
			showError(error);
		}
	};

	const removePassword = async () => {
		if (!user) {
			return;
		}
		const confirmed = await confirmDialog({
			danger: true,
			title: 'Remove password?',
			confirmText: 'Remove Password',
			content: `${user.name} can then only sign in with a linked sign in provider.`,
		});
		if (!confirmed) {
			return;
		}
		try {
			await API.query({
				query: gql(`
					mutation RemoveUserPassword($id: String!, $password: String) {
						setUserPassword(id: $id, password: $password) { id }
					}
				`),
				variables: { id: user.id, password: null },
			});
			setHasPassword(false);
			doToast({ message: 'Password removed', type: 'success' });
		} catch (error) {
			showError(error);
		}
	};

	const deleteUser = async () => {
		if (!user) {
			return;
		}
		try {
			await API.query({
				query: gql(`
					mutation DeleteUser($id: String!) {
						deleteUser(id: $id)
					}
				`),
				variables: { id: user.id },
			});
			doToast({ message: 'User deleted', type: 'success' });
			props.onClose(true);
		} catch (error) {
			showError(error);
		}
	};

	return (
		<Drawer
			id={user?.id ?? NEW_USER}
			title={isNew ? 'Add User' : `Edit ${user.name}`}
			subtitle={isNew ? undefined : user.email}
			onClose={() => props.onClose()}
			onSave={save}
			saveText={isNew ? 'Add User' : 'Save'}
			onDelete={isNew || isSelf ? undefined : deleteUser}
			deleteText={
				user
					? {
							title: `Delete ${user.name}?`,
							content: `${user.email} will no longer be able to sign in. Invoices and other data are not affected.`,
						}
					: undefined
			}
		>
			<div className="divide-y divide-gray-200 px-4 sm:px-6">
				<Section title="Profile">
					<Input label="Name" value={name} onChange={setName} />
					<Input label="Email" type="email" value={email} onChange={setEmail} />
					<SelectInput
						label="Role"
						value={role}
						options={roleOptions}
						onChange={(value) => setRole((value as UserRole) || UserRole.User)}
					/>
				</Section>

				{!isNew && (
					<Section
						title="Access"
						subtitle={
							isSelf
								? 'You cannot block your own account.'
								: 'Blocked users cannot sign in. Their data stays.'
						}
					>
						{!isSelf && (
							<SelectInput
								label="Status"
								value={blocked ? 'blocked' : 'active'}
								options={accessOptions}
								onChange={(value) => setBlocked(value === 'blocked')}
							/>
						)}
						<p className="text-xs text-gray-500">
							Sign in with:{' '}
							{signInMethods.length ? signInMethods.join(', ') : 'nothing yet'}
						</p>
					</Section>
				)}

				{localEnabled && (
					<Section
						title="Password"
						subtitle={
							isNew
								? 'Optional. Without a password the user signs in with a linked provider.'
								: hasPassword
									? 'Leave empty to keep the current password.'
									: 'The user has no password yet.'
						}
					>
						<Input
							label={isNew || !hasPassword ? 'Password' : 'New password'}
							type="password"
							value={password}
							onChange={setPassword}
							placeholder="At least 10 characters"
						/>
						{!isNew && hasPassword && (
							<div>
								<Button small secondary onClick={removePassword}>
									Remove password
								</Button>
							</div>
						)}
					</Section>
				)}
			</div>
		</Drawer>
	);
}

'use client';

import React from 'react';
import { API, gql } from '@/api/index';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { PageContent } from '@/components/page';
import { SettingsBlock } from '@/components/settings-block';
import { doToast } from '@/components/toast';
import { useLoadData } from '@/hooks/load-data';

/** Section description, same style as on the settings page. */
const Hint = ({ children }: { children: React.ReactNode }) => (
	<div className="prose prose-sm leading-4 text-xs text-gray-500/80">
		{children}
	</div>
);

export default function AccountPage() {
	const { data, reload } = useLoadData(async () =>
		API.query({
			query: gql(`
				query AccountPage {
					me {
						id
						email
						name
						role
						hasPassword
						identityProviders
					}
					authOptions {
						localEnabled
					}
				}
			`),
		}),
	);
	const [currentPassword, setCurrentPassword] = React.useState('');
	const [newPassword, setNewPassword] = React.useState('');
	const [repeatPassword, setRepeatPassword] = React.useState('');

	const me = data?.me;

	return (
		<PageContent
			title="My Account"
			noPadding
			contentClassName="overflow-hidden pt-6"
		>
			<div className="space-y-12 p-6 pt-0 divide-y divide-gray-900/10">
				<SettingsBlock
					title="Profile"
					subtitle={
						<Hint>
							Your name and email address are managed by an administrator.
						</Hint>
					}
				>
					<dl className="text-sm text-gray-700 grid grid-cols-3 gap-2">
						<dt className="font-medium">Name</dt>
						<dd className="col-span-2">{me?.name}</dd>
						<dt className="font-medium">Email</dt>
						<dd className="col-span-2">{me?.email}</dd>
						<dt className="font-medium">Role</dt>
						<dd className="col-span-2">
							{me?.role === 'ADMIN' ? 'Administrator' : 'User'}
						</dd>
						<dt className="font-medium">Sign in providers</dt>
						<dd className="col-span-2">
							{me?.identityProviders.length
								? me.identityProviders.join(', ')
								: '-'}
						</dd>
					</dl>
				</SettingsBlock>
				{data?.authOptions.localEnabled && (
					<SettingsBlock
						title={me?.hasPassword ? 'Change Password' : 'Set a Password'}
						subtitle={<Hint>Use at least 10 characters.</Hint>}
					>
						{me?.hasPassword && (
							<Input
								label="Current password"
								type="password"
								value={currentPassword}
								onChange={setCurrentPassword}
							/>
						)}
						<Input
							label="New password"
							type="password"
							value={newPassword}
							onChange={setNewPassword}
						/>
						<Input
							label="Repeat new password"
							type="password"
							value={repeatPassword}
							onChange={setRepeatPassword}
						/>
						<div>
							<Button
								primary
								onClick={() => {
									if (newPassword !== repeatPassword) {
										doToast({
											message: 'The new passwords do not match',
											type: 'danger',
										});
										return;
									}
									doToast({
										promise: API.query({
											query: gql(`
												mutation ChangeOwnPassword($currentPassword: String, $newPassword: String!) {
													changeOwnPassword(currentPassword: $currentPassword, newPassword: $newPassword)
												}
											`),
											variables: { currentPassword, newPassword },
										})
											.then(() => {
												setCurrentPassword('');
												setNewPassword('');
												setRepeatPassword('');
												reload();
											})
											.catch((error) => {
												doToast({
													message: API.getErrorMessage(error),
													type: 'danger',
												});
												throw error;
											}),
										loading: 'Saving password...',
										success: 'Password saved',
										error: 'Password was not changed',
									});
								}}
							>
								Save Password
							</Button>
						</div>
					</SettingsBlock>
				)}
			</div>
		</PageContent>
	);
}

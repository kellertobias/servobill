'use client';

import { ExclamationTriangleIcon } from '@heroicons/react/20/solid';
import React from 'react';
import { API, gql } from '@/api/index';
import { Button } from '@/components/button';
import { confirmDialog } from '@/components/dialog';
import { Input } from '@/components/input';
import { PageContent } from '@/components/page';
import { SettingsBlock } from '@/components/settings-block';
import { doToast } from '@/components/toast';

function DangerousAction({
	onClick,
	title,
	subtitle,
	name,
}: {
	onClick: () => Promise<void> | void;
	title: string;
	subtitle: string | React.ReactNode;
	name: string;
}) {
	const [confirmText, setConfirmText] = React.useState('');
	const [deleted, setDeleted] = React.useState(false);
	const requiredConfirmText = `Delete ${name}`;
	return (
		<SettingsBlock
			title={title}
			subtitle={
				<div className="prose prose-sm leading-4 text-xs text-gray-500/80">
					{subtitle}
				</div>
			}
		>
			{deleted ? (
				<>
					<div className="rounded-md bg-yellow-50 p-4">
						<div className="flex">
							<div className="flex-shrink-0">
								<ExclamationTriangleIcon
									className="h-5 w-5 text-yellow-400"
									aria-hidden="true"
								/>
							</div>
							<div className="ml-3">
								<h3 className="text-sm font-medium text-yellow-800">
									Deletion Successful
								</h3>
								<div className="mt-2 text-sm text-yellow-700">
									<p>All {name} have been deleted.</p>
								</div>
							</div>
						</div>
					</div>
				</>
			) : (
				<>
					<Input
						label={`1. Type "${requiredConfirmText}"`}
						value={confirmText}
						placeholder={`Type "${requiredConfirmText}"`}
						onChange={setConfirmText}
					/>

					<div>
						<label className="text-sm font-medium leading-6 text-gray-900 hidden md:block mb-3">
							2. Confirm Deletion of all {name}
						</label>
						<Button
							danger
							onClick={async () => {
								if (confirmText !== requiredConfirmText) {
									doToast({
										icon: ExclamationTriangleIcon,
										message: `You must type "${requiredConfirmText}" to confirm deletion of all ${name}`,
										type: 'danger',
									});
									return;
								}
								if (
									(await confirmDialog({
										danger: true,
										title: `Delete ${name}?`,
										content: (
											<>
												Are you sure you want to delete all {name}? This action
												cannot be undone.
											</>
										),
									})) &&
									(await new Promise<boolean>((resolve) =>
										setTimeout(() => resolve(true), 750),
									)) &&
									(await confirmDialog({
										danger: true,
										title: `Really Delete ${name}?`,
										content: (
											<>
												Sorry to annoy you with this again, but are you really
												sure? This action cannot be undone.
											</>
										),
									}))
								) {
									doToast({
										promise: (async () => {
											await onClick();
											setDeleted(true);
											return true;
										})(),
										loading: `Deleting ${name}...`,
										success: `${name} deleted`,
										error: `${name} could not be deleted`,
									});
								}
							}}
						>
							Delete all {name} now
						</Button>
					</div>
				</>
			)}
		</SettingsBlock>
	);
}

export default function DangerZoneHomePage() {
	return (
		<>
			<PageContent
				title="Settings - Danger Zone"
				noPadding
				contentClassName="overflow-hidden pt-6"
			>
				<div className="space-y-12 p-6 pt-0 divide-y divide-gray-900/10">
					<DangerousAction
						name="Invoices & Offers"
						title="Delete All Invoices & Offers"
						subtitle={
							<>
								<p>
									You can delete all invoices and offers. This action is
									irreversible. You will loose all invoices and offers and
									payment information. You won't be able to generate a tax
									report for the deleted invoices.
								</p>
								<p>
									We do not yet delete generated PDF invoices and offers. You
									will have to delete them manually. We do not reset your
									invoice and offer numbers. You will have to do that manually.
								</p>
							</>
						}
						onClick={() => {
							API.query({
								query: gql(`
									mutation PurgeInvoices {
										purgeInvoices(confirm: "confirm")
									}
								`),
							});
						}}
					/>
					<DangerousAction
						name="Expenses"
						title="Delete All Expenses"
						subtitle={
							<>
								<p>
									You can delete all expenses. This action is irreversible. You
									will loose all expenses and payment information. You won't be
									able to generate a tax report for the deleted expenses.
								</p>
								<p>
									We do not yet delete any related attachments from the file
									Store. You will have to delete them manually.
								</p>
							</>
						}
						onClick={() => {
							API.query({
								query: gql(`
									mutation PurgeExpenses {
										purgeExpenses(confirm: "confirm")
									}
								`),
							});
						}}
					/>
				</div>
			</PageContent>
		</>
	);
}

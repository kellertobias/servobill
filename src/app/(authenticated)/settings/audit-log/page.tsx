'use client';

import React from 'react';
import { API, gql } from '@/api/index';
import SelectInput from '@/app/_components/select-input';
import { Button } from '@/components/button';
import { PageContent } from '@/components/page';
import { Table } from '@/components/table';
import { doToast } from '@/components/toast';

type Entry = {
	id: string;
	createdAt: string;
	actorId?: string | null;
	actorEmail?: string | null;
	actorName?: string | null;
	action: string;
	entityType?: string | null;
	entityId?: string | null;
	success: boolean;
	details: string;
	ipAddress?: string | null;
};

const PAGE_SIZE = 50;
const ALL_USERS = '__all__';

const loadPage = async (actorId: string | undefined, cursor?: string) => {
	const result = await API.query({
		query: gql(`
			query AuditLogPage($where: AuditLogFilter) {
				auditLog(where: $where) {
					entries {
						id
						createdAt
						actorId
						actorEmail
						actorName
						action
						entityType
						entityId
						success
						details
						ipAddress
					}
					nextCursor
				}
			}
		`),
		variables: { where: { actorId, cursor, limit: PAGE_SIZE } },
	});
	return result.auditLog;
};

/** Shows the details JSON in a readable, collapsible form. */
function Details({ json }: { json: string }) {
	const [open, setOpen] = React.useState(false);
	const pretty = React.useMemo(() => {
		try {
			return JSON.stringify(JSON.parse(json), null, 2);
		} catch {
			return json;
		}
	}, [json]);
	if (pretty === '{}') {
		return null;
	}
	return (
		<div className="mt-1 text-xs">
			<button
				type="button"
				className="text-indigo-600 hover:text-indigo-800"
				onClick={() => setOpen(!open)}
			>
				{open ? 'Hide details' : 'Show details'}
			</button>
			{open && (
				<pre className="mt-2 max-w-2xl overflow-x-auto whitespace-pre-wrap rounded bg-gray-50 p-2 text-gray-700">
					{pretty}
				</pre>
			)}
		</div>
	);
}

export default function AuditLogPage() {
	const [entries, setEntries] = React.useState<Entry[]>([]);
	const [cursor, setCursor] = React.useState<string | undefined>();
	const [loading, setLoading] = React.useState(true);
	const [actorId, setActorId] = React.useState<string>(ALL_USERS);
	const [users, setUsers] = React.useState<{ id: string; label: string }[]>([]);

	const actorFilter = actorId === ALL_USERS ? undefined : actorId;

	React.useEffect(() => {
		API.query({
			query: gql(`
				query AuditLogUsers {
					users { id name email }
				}
			`),
		})
			.then((result) =>
				setUsers(
					result.users.map((user) => ({
						id: user.id,
						label: `${user.name} (${user.email})`,
					})),
				),
			)
			.catch(() => setUsers([]));
	}, []);

	React.useEffect(() => {
		setLoading(true);
		loadPage(actorFilter)
			.then((page) => {
				setEntries(page.entries as Entry[]);
				setCursor(page.nextCursor || undefined);
			})
			.catch((error) =>
				doToast({ message: API.getErrorMessage(error), type: 'danger' }),
			)
			.finally(() => setLoading(false));
	}, [actorFilter]);

	const loadMore = async () => {
		if (!cursor) {
			return;
		}
		setLoading(true);
		try {
			const page = await loadPage(actorFilter, cursor);
			setEntries((current) => [...current, ...(page.entries as Entry[])]);
			setCursor(page.nextCursor || undefined);
		} catch (error) {
			doToast({ message: API.getErrorMessage(error), type: 'danger' });
		} finally {
			setLoading(false);
		}
	};

	return (
		<PageContent
			title="Audit Log"
			noPadding
			contentClassName="overflow-hidden pt-6"
			footer={
				<p className="mx-auto mt-6 max-w-2xl px-4 text-center text-xs text-gray-500">
					Every change made through the app and every sign in, newest first.
					Passwords and other secrets are never stored here.
				</p>
			}
		>
			<div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
				<h2 className="text-base font-semibold leading-6 text-gray-900">
					Activity
				</h2>
				<div className="w-full sm:w-72">
					<SelectInput
						value={actorId}
						options={[
							{ value: ALL_USERS, label: 'All users' },
							...users.map((user) => ({ value: user.id, label: user.label })),
						]}
						onChange={(value) => setActorId(value || ALL_USERS)}
					/>
				</div>
			</div>
			<div className="mt-6">
				<Table
					data={entries}
					loading={loading && entries.length === 0}
					keyField="id"
					notFound={{
						title: 'No entries',
						subtitle: 'Nothing has been recorded for this selection yet.',
					}}
					columns={[
						{
							key: 'createdAt',
							title: 'Time',
							className: 'py-5 pr-6 align-top',
							render: (entry) => {
								const date = new Date(entry.createdAt);
								return (
									<>
										<div className="whitespace-nowrap text-sm leading-6 text-gray-900">
											{date.toLocaleDateString()}
										</div>
										<div className="mt-1 text-xs leading-5 text-gray-500">
											{date.toLocaleTimeString()}
										</div>
									</>
								);
							},
						},
						{
							key: 'actor',
							title: 'User',
							className: 'py-5 pr-6 align-top hidden sm:table-cell',
							render: (entry) => (
								<>
									<div className="text-sm leading-6 text-gray-900">
										{entry.actorName || entry.actorEmail || 'Anonymous'}
									</div>
									<div className="mt-1 text-xs leading-5 text-gray-500">
										{[
											entry.actorName ? entry.actorEmail : null,
											entry.ipAddress ? `IP ${entry.ipAddress}` : null,
										]
											.filter(Boolean)
											.join(' · ')}
									</div>
								</>
							),
						},
						{
							key: 'action',
							title: 'Action',
							className: 'py-5 pr-6 align-top',
							render: (entry) => (
								<>
									<div className="text-sm font-medium leading-6 text-gray-900">
										{entry.action}
										{!entry.success && (
											<span className="ml-2 inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
												Failed
											</span>
										)}
									</div>
									{(entry.entityType || entry.entityId) && (
										<div className="mt-1 text-xs leading-5 text-gray-500">
											{[entry.entityType, entry.entityId]
												.filter(Boolean)
												.join(' ')}
										</div>
									)}
									<Details json={entry.details} />
								</>
							),
						},
					]}
				/>
			</div>
			{cursor && (
				<div className="flex justify-center border-t border-gray-100 p-6">
					<Button secondary onClick={loadMore} loading={loading}>
						Load older entries
					</Button>
				</div>
			)}
		</PageContent>
	);
}

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
		<div className="text-xs">
			<button
				type="button"
				className="text-indigo-600 hover:text-indigo-800"
				onClick={() => setOpen(!open)}
			>
				{open ? 'Hide details' : 'Show details'}
			</button>
			{open && (
				<pre className="mt-1 max-w-xl overflow-x-auto whitespace-pre-wrap rounded bg-gray-50 p-2 text-gray-700">
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
		<PageContent title="Audit Log" noPadding>
			<div className="flex flex-wrap items-end justify-between gap-4 px-6 pt-6">
				<p className="max-w-2xl text-sm text-gray-600">
					Every change made through the app and every sign in, newest first.
					Passwords and other secrets are never stored here.
				</p>
				<div className="w-72">
					<SelectInput
						label="User"
						value={actorId}
						options={[
							{ value: ALL_USERS, label: 'All users' },
							...users.map((user) => ({ value: user.id, label: user.label })),
						]}
						onChange={(value) => setActorId(value || ALL_USERS)}
					/>
				</div>
			</div>
			<Table
				data={entries}
				loading={loading && entries.length === 0}
				keyField="id"
				columns={[
					{
						key: 'createdAt',
						title: 'Time',
						render: (entry) => (
							<span className="whitespace-nowrap text-sm text-gray-700">
								{new Date(entry.createdAt).toLocaleString()}
							</span>
						),
					},
					{
						key: 'actor',
						title: 'User',
						render: (entry) => (
							<div className="text-sm">
								<div className="text-gray-900">
									{entry.actorName || entry.actorEmail || 'Anonymous'}
								</div>
								{entry.actorName && entry.actorEmail && (
									<div className="text-xs text-gray-500">
										{entry.actorEmail}
									</div>
								)}
								{entry.ipAddress && (
									<div className="text-xs text-gray-400">{entry.ipAddress}</div>
								)}
							</div>
						),
					},
					{
						key: 'action',
						title: 'Action',
						render: (entry) => (
							<div className="text-sm">
								<div className="font-medium text-gray-900">
									{entry.action}
									{!entry.success && (
										<span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-700">
											failed
										</span>
									)}
								</div>
								{(entry.entityType || entry.entityId) && (
									<div className="text-xs text-gray-500">
										{[entry.entityType, entry.entityId]
											.filter(Boolean)
											.join(' ')}
									</div>
								)}
							</div>
						),
					},
					{
						key: 'details',
						title: 'Details',
						render: (entry) => <Details json={entry.details} />,
					},
				]}
			/>
			{cursor && (
				<div className="flex justify-center p-6">
					<Button secondary onClick={loadMore}>
						{loading ? 'Loading…' : 'Load older entries'}
					</Button>
				</div>
			)}
		</PageContent>
	);
}

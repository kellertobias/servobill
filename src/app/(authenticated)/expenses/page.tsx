'use client';

import React from 'react';

import { PlusIcon } from '@heroicons/react/20/solid';
import dayjs from 'dayjs';

import { Button } from '@/components/button';
import { PageContent } from '@/components/page';
import { Table } from '@/components/table';
import { useLoadData } from '@/hooks/load-data';
import { API, gql } from '@/api/index';
import { exportExpenses, importExpenses } from '@/api/import-export/expenses';

import ExpenseOverlay from './expense-overlay';

export default function ExpensesHomePage() {
	const pageSize = 10;
	const currentPage = React.useRef(0);
	const [selectedExpenseId, setSelectedExpenseId] = React.useState<
		null | string
	>(null);
	const [categories, setCategories] = React.useState<any[]>([]);

	const { data, loading, reload } = useLoadData(async () => {
		const data = await API.query({
			query: gql(`
				query ExpensesHomePageListData($skip: Int!, $pageSize: Int!) {
					expenses(limit: $pageSize, skip: $skip) {
						id
						name
						description
						expendedCents
						expendedAt
						createdAt
					}
				}
			`),
			variables: {
				skip: currentPage.current * pageSize,
				pageSize,
			},
		}).then((res) => res.expenses);
		return data;
	});

	React.useEffect(() => {
		API.query({
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			query: gql(`
				query GetSettingsCategories {
					settings { categories { id name icon color description } }
				}
			`) as any,
		}).then((res) => setCategories((res as any).settings.categories || []));
	}, []);

	return (
		<>
			{selectedExpenseId && (
				<ExpenseOverlay
					expenseId={selectedExpenseId}
					onClose={(reloadData?: boolean) => {
						setSelectedExpenseId(null);
						if (reloadData) {
							reload();
						}
					}}
					openCreated={(id) => {
						setSelectedExpenseId(id);
					}}
				/>
			)}
			<PageContent
				title="Expenses"
				noPadding
				contentClassName="overflow-hidden pt-6"
				right={
					<>
						<Button
							icon={PlusIcon}
							header
							grouped
							onClick={() => setSelectedExpenseId('new')}
						>
							New Expense
						</Button>
					</>
				}
				footer={
					<>
						<div className="flex justify-center mt-6 gap-1 text-gray-500 text-xs">
							<a
								className="text-xs text-gray-500 hover:text-gray-900 cursor-pointer"
								onClick={async () => {
									await importExpenses();

									reload();
								}}
							>
								Import from JSON
							</a>{' '}
							&bull;{' '}
							<a
								className="text-xs text-gray-500 hover:text-gray-900 cursor-pointer"
								onClick={async () => {
									await exportExpenses();
								}}
							>
								Export to JSON
							</a>
						</div>
					</>
				}
			>
				<Table
					title="Expenses"
					data={data}
					loading={loading}
					keyField="id"
					getCategory={(data) => dayjs(data.expendedAt).format('MMMM, YYYY')}
					getLineLink={(data) => () => setSelectedExpenseId(data.id)}
					columns={[
						{
							key: 'category',
							title: 'Category',
							className: 'py-5',
							render: (expense) => {
								const cat = categories?.find(
									(c) => c.id === (expense as any).categoryId,
								);
								if (!cat) return null;
								return (
									<span
										className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
										style={{
											backgroundColor: cat.color || '#888',
											color: '#fff',
										}}
										title={cat.description || cat.name}
									>
										{cat.name}
									</span>
								);
							},
						},
						{
							key: 'name',
							title: 'Name',
							className: 'py-5',
							render: (expense) => (
								<>
									<div className="text-sm font-medium leading-6 text-gray-900">
										{expense.name}
									</div>
									<div className="mt-1 text-xs leading-5 text-gray-500">
										<span className="text-gray-900 truncate">
											{dayjs(expense.expendedAt).format('DD.MM.YYYY')}
										</span>
									</div>
								</>
							),
						},
						{
							key: 'action',
							title: 'Action',
							className: 'py-5 text-right',
							render: (expense) => (
								<>
									<div className="flex justify-end">
										<a
											onClick={() => setSelectedExpenseId(expense.id)}
											className="text-sm font-medium leading-6 text-indigo-600 hover:text-indigo-500"
										>
											View <span className="hidden sm:inline">Expense</span>
										</a>
									</div>
									<div className="mt-1 text-xs leading-5 text-gray-500">
										<span className="text-gray-900">
											{API.centsToPrice(expense.expendedCents)} €
										</span>
									</div>
								</>
							),
						},
					]}
				/>
			</PageContent>
		</>
	);
}

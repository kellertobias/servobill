'use client';

import { PlusIcon, SparklesIcon } from '@heroicons/react/20/solid';
import dayjs from 'dayjs';
import React from 'react';
import { exportExpenses, importExpenses } from '@/api/import-export/expenses';
import { API, gql } from '@/api/index';
import { Button } from '@/components/button';
import { PageContent } from '@/components/page';
import { Table } from '@/components/table';
import { useLoadData } from '@/hooks/load-data';
import AIExtractionModal from './ai-extraction-modal';
import ExpenseOverlay from './expense-overlay';

export default function ExpensesHomePage() {
	const [selectedExpenseId, setSelectedExpenseId] = React.useState<
		null | string
	>(null);
	const [isAIExtractionModalOpen, setIsAIExtractionModalOpen] =
		React.useState(false);

	const { data, loading, reload } = useLoadData(async () => {
		const data = await API.query({
			query: gql(`
				query ExpensesHomePageListData {
					expenses {
						id
						name
						description
						expendedCents
						expendedAt
						createdAt
						category {
							id
							name
							color
							description
						}
					}
				}
			`),
		}).then((res) => res.expenses);
		return data;
	});

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

			<AIExtractionModal
				isOpen={isAIExtractionModalOpen}
				onClose={() => setIsAIExtractionModalOpen(false)}
				onExtractionComplete={reload}
			/>

			<PageContent
				title="Expenses"
				noPadding
				contentClassName="overflow-hidden pt-6"
				right={
					<>
						{process.env.NEXT_PUBLIC_HAS_LLM === 'true' && (
							<Button
								icon={SparklesIcon}
								header
								grouped
								onClick={() => setIsAIExtractionModalOpen(true)}
							>
								AI Upload
							</Button>
						)}
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
							className: 'py-5 w-24',
							/**
							 * Renders the category label for each expense. If the expense has a category, displays its name and color.
							 * If there is no category, displays a gray 'Default' label.
							 */
							render: (expense) => (
								<>
									{expense.category ? (
										<span
											className="inline-flex items-center gap-x-1.5 rounded-full px-2 py-1 text-xs font-medium text-gray-900 ring-1 ring-inset ring-gray-200 w-20 justify-center overflow-clip text-ellipsis"
											title={
												expense.category.description || expense.category.name
											}
										>
											<svg
												viewBox="0 0 6 6"
												aria-hidden="true"
												className="w-1.5 h-1.5"
												style={{ fill: expense.category.color || '#888' }}
											>
												<circle r={3} cx={3} cy={3} />
											</svg>
											{expense.category.name}
										</span>
									) : (
										// Show a gray 'Default' label if no category is set
										<span
											className="inline-flex items-center gap-x-1.5 rounded-full px-2 py-1 text-xs font-medium text-gray-500 ring-1 ring-inset ring-gray-200 w-20 justify-center overflow-clip text-ellipsis"
											title="No category assigned"
										>
											Default
										</span>
									)}
								</>
							),
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

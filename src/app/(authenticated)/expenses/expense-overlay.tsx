import React from 'react';

import dayjs from 'dayjs';

import { useLoadData, useSaveCallback } from '@/hooks/load-data';
import { API, gql } from '@/api/index';
import { Drawer } from '@/components/drawer';
import { Input } from '@/components/input';
import { LoadingSkeleton } from '@/components/loading';

export default function ExpenseOverlay({
	expenseId,
	onClose,
	openCreated,
}: {
	expenseId: string;
	onClose: (reloadData?: boolean) => void;
	openCreated?: (id: string) => void;
}) {
	const [taxManuallyChanged, setTaxManuallyChanged] = React.useState(false);
	const { data, setData, initialData, reload } = useLoadData(
		async ({ expenseId }) =>
			expenseId === 'new'
				? {
						id: 'new',
						name: '',
						description: '',
						notes: '',
						expenditure: '',
						taxAmount: '',
						expendedAt: dayjs().format('YYYY-MM-DD'),
						createdAt: null,
						updatedAt: null,
					}
				: API.query({
						query: gql(`
							query ExpenseOverlayData($expenseId: String!) {
								expense(id: $expenseId) {
									id
									name
									description
									notes
									expendedCents
									expendedAt
									taxCents
									createdAt
									updatedAt
								}
							}
						`),
						variables: {
							expenseId,
						},
					}).then((res) => ({
						...res.expense,
						expenditure: API.centsToPrice(res.expense.expendedCents),
						taxAmount: API.centsToPrice(res.expense.taxCents),
						expendedAt: dayjs(res.expense.expendedAt).format('YYYY-MM-DD'),
					})),
		{ expenseId },
	);

	const { onSave } = useSaveCallback({
		id: expenseId,
		entityName: 'Expense',
		data,
		initialData,
		openCreated,
		reload,
		mapper: (data) => {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { id, expenditure, taxAmount, createdAt, updatedAt, ...rest } =
				data;
			return {
				...rest,
				expendedCents: API.priceToCents(expenditure),
				taxCents: API.priceToCents(taxAmount),
				expendedAt: dayjs(data?.expendedAt).toISOString(),
			};
		},
	});

	return (
		<Drawer
			id={expenseId}
			title={expenseId === 'new' ? 'New Expense' : 'Edit Expense'}
			subtitle={initialData?.name}
			onClose={onClose}
			onSave={
				onSave
					? async () => {
							await onSave?.();
							onClose(true);
						}
					: undefined
			}
			deleteText={{
				title: 'Delete Expense',
				content: (
					<>
						Are you sure you want to delete the Expense
						<b>{data?.name}</b>? This action cannot be undone.
					</>
				),
			}}
			onDelete={
				expenseId === 'new'
					? undefined
					: async () => {
							await API.query({
								query: gql(`
						mutation DeleteExpense($id: String!) {
							deleteExpense(id: $id) {id}
						}
					`),
								variables: {
									id: expenseId,
								},
							});
							onClose(true);
						}
			}
		>
			{data ? (
				<>
					<div className="divide-y divide-gray-200 px-4 sm:px-6">
						<div className="space-y-6 pb-5 pt-6">
							<div>
								<Input
									label="Expense Name"
									value={data?.name}
									onChange={(name) =>
										setData((current) => ({ ...current, name }))
									}
								/>
							</div>
							<div>
								<Input
									label="Expenditure (Amount)"
									value={data?.expenditure}
									onChange={(expenditure) =>
										setData((current) => {
											let taxAmount = current?.taxAmount;
											if (!taxManuallyChanged) {
												taxAmount = API.centsToPrice(
													API.priceToCents(expenditure) * 0.19,
												);
											}
											return { ...current, expenditure, taxAmount };
										})
									}
								/>
							</div>
							<div>
								<Input
									label="Included Tax (Amount)"
									value={data?.taxAmount}
									onChange={(taxAmount) => {
										setTaxManuallyChanged(true);
										setData((current) => ({ ...current, taxAmount }));
									}}
								/>
							</div>
							<div>
								<Input
									label="Expended At"
									value={data?.expendedAt}
									onChange={(expendedAt) =>
										setData((current) => ({ ...current, expendedAt }))
									}
								/>
							</div>
							<div>
								<Input
									label="Description"
									value={data?.description}
									onChange={(description) =>
										setData((current) => ({ ...current, description }))
									}
									textarea
								/>
							</div>
							<div>
								<Input
									label="Notes (Private)"
									value={data?.notes}
									onChange={(notes) =>
										setData((current) => ({ ...current, notes }))
									}
									textarea
								/>
							</div>
						</div>
					</div>
				</>
			) : (
				<LoadingSkeleton />
			)}
		</Drawer>
	);
}

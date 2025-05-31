import React from 'react';

import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import dayjs from 'dayjs';

import { useLoadData, useSaveCallback } from '@/hooks/load-data';
import { API, gql } from '@/api/index';
import { Drawer } from '@/components/drawer';
import { Input } from '@/components/input';
import { LoadingSkeleton } from '@/components/loading';
import SelectInput from '@/components/select-input';
import {
	AttachmentDropzone,
	AttachmentFile,
} from '@/components/attachment-dropzone';

import { useExpenseCategories } from '@/app/_hooks/use-expense-categories';

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
	const categories = useExpenseCategories();
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
						categoryId: '',
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
									categoryId
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
						categoryId: res.expense.categoryId || '',
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

	const [attachments, setAttachments] = React.useState<AttachmentFile[]>([]);
	React.useEffect(() => {
		if (expenseId === 'new') {
			setAttachments([]);
		} else {
			// Fetch attachments for this expense
			(async () => {
				const ATTACHMENTS_QUERY = gql(`
					query ExpenseAttachments($expenseId: String!) {
						attachments(input: { expenseId: $expenseId }) {
							id
							fileName
							mimeType
							size
							status
							s3Key
							s3Bucket
							expenseId
							invoiceId
							inventoryId
							createdAt
							updatedAt
						}
					}
				`);
				const resRaw = await API.query({
					query: ATTACHMENTS_QUERY as TypedDocumentNode<unknown, unknown>,
					variables: { expenseId },
				});
				const res = resRaw as { attachments: AttachmentFile[] };
				setAttachments(res.attachments || []);
			})();
		}
	}, [expenseId]);

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
									placeholder="Name of the expense"
									value={data?.name}
									onChange={(name) =>
										setData((current) => ({ ...current, name }))
									}
								/>
							</div>
							<div className="flex flex-row gap-2">
								<div>
									<Input
										label="Expenditure (Amount)"
										value={data?.expenditure}
										placeholder="0.00"
										onChange={(expenditure) =>
											setData((current) => {
												let taxAmount = current?.taxAmount;
												if (!taxManuallyChanged) {
													taxAmount = API.centsToPrice(
														Math.round(
															(API.priceToCents(expenditure) / 119) * 19,
														),
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
										placeholder="0.00"
										onChange={(taxAmount) => {
											setTaxManuallyChanged(true);
											setData((current) => ({ ...current, taxAmount }));
										}}
									/>
								</div>
							</div>
							<div>
								<Input
									label="Expended At"
									placeholder="YYYY-MM-DD"
									value={data?.expendedAt}
									onChange={(expendedAt) =>
										setData((current) => ({ ...current, expendedAt }))
									}
								/>
							</div>
							<div>
								<SelectInput
									label="Category"
									value={data?.categoryId || ''}
									onChange={(categoryId) =>
										setData((current) => ({
											...current,
											categoryId: categoryId || undefined,
										}))
									}
									options={categories.map((cat) => ({
										value: cat.id,
										label: cat.name,
										description: cat.description || '',
										color: cat.color || undefined,
									}))}
									placeholder="Select category"
									className="w-full"
								/>
							</div>
							<div>
								<Input
									label="Description"
									placeholder="Description of the expense, shown on tax export"
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
									placeholder="Private notes about the expense. For internal reference."
									onChange={(notes) =>
										setData((current) => ({ ...current, notes }))
									}
									textarea
								/>
							</div>
							<div>
								<AttachmentDropzone
									value={attachments}
									onChange={setAttachments}
									expenseId={expenseId === 'new' ? undefined : expenseId}
									readOnly={expenseId === 'new'}
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

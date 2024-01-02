import React from 'react';

import { useLoadData, useSaveCallback } from '@/hooks/load-data';
import { API, gql } from '@/api/index';
import { Drawer } from '@/components/drawer';
import { Input } from '@/components/input';
import { LoadingSkeleton } from '@/components/loading';

export default function ProductOverlay({
	productId,
	onClose,
	openCreated,
}: {
	productId: string;
	onClose: (reloadData?: boolean) => void;
	openCreated: (id: string) => void;
}) {
	const { data, setData, initialData, reload } = useLoadData(
		async ({ productId }) =>
			productId === 'new'
				? {
						id: 'new',
						name: '',
						category: '',
						description: '',
						notes: '',
						price: '',
						taxPercentage: '0',
						createdAt: null,
						updatedAt: null,
					}
				: API.query({
						query: gql(`
							query ProductsDetailPageData($id: String!) {
								product(id: $id) {
									id
									name
									category
									description
									notes
									priceCents
									taxPercentage
									createdAt
									updatedAt
								}
							}
						`),
						variables: {
							id: productId,
						},
					}).then((res) =>
						res.product
							? {
									...res.product,
									price: API.centsToPrice(res.product.priceCents),
									taxPercentage: `${res.product.taxPercentage || 0}`,
								}
							: null,
					),
		{ productId },
	);

	const { onSave } = useSaveCallback({
		id: productId,
		entityName: 'Product',
		data,
		initialData,
		openCreated,
		reload,
		mapper: (data) => {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { id, price, createdAt, updatedAt, ...rest } = data;
			return {
				...rest,
				priceCents: API.priceToCents(price),
				taxPercentage: Number.parseInt(data.taxPercentage || '0'),
			};
		},
	});

	return (
		<Drawer
			id={productId}
			title={productId === 'new' ? 'New Product' : 'Edit Product'}
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
				title: 'Delete Product',
				content: (
					<>
						Are you sure you want to delete the product <b>{data?.name}</b>?
						This action cannot be undone.
						<br />
						Invoices and Offers containing this product will not be deleted.
					</>
				),
			}}
			onDelete={
				productId === 'new'
					? undefined
					: async () => {
							await API.query({
								query: gql(`
						mutation DeleteProduct($id: String!) {
							deleteProduct(id: $id) {id}
						}
					`),
								variables: {
									id: productId,
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
							<Input
								className="col-span-full"
								label="Product Name"
								value={data.name}
								onChange={(name) => {
									setData((prev) => ({ ...prev, name }));
								}}
								displayFirst
							/>

							<Input
								className="col-span-full"
								label="Price"
								value={data.price}
								onChange={(price) => {
									setData((prev) => ({ ...prev, price }));
								}}
								displayFirst
							/>

							<Input
								className="col-span-full"
								label="Tax Percentage"
								value={data.taxPercentage}
								onChange={(taxPercentage) => {
									setData((prev) => ({ ...prev, taxPercentage }));
								}}
								displayFirst
							/>

							<Input
								className="col-span-full"
								label="Category"
								value={data.category}
								onChange={(category) => {
									setData((prev) => ({ ...prev, category }));
								}}
								displayFirst
							/>

							<Input
								className="col-span-full"
								label="Description (On Bills)"
								value={data.description}
								onChange={(description) => {
									setData((prev) => ({ ...prev, description }));
								}}
								displayFirst
								textarea
							/>

							<Input
								className="col-span-full"
								label="Notes (Private)"
								value={data.notes}
								onChange={(notes) => {
									setData((prev) => ({ ...prev, notes }));
								}}
								displayFirst
								textarea
							/>
						</div>
					</div>
				</>
			) : (
				<LoadingSkeleton />
			)}
		</Drawer>
	);
}

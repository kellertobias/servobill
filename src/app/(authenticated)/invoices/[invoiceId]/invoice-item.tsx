import clsx from 'clsx';
import { useModal } from 'react-modal-hook';

import { API } from '@/api/index';

import { InvoiceData } from './data';
import {
	InlineEditableText,
	InvoiceItemDivider,
	InvoiceLookupStartButton,
	InvoiceRowDeleteButton,
} from './helpers';
import { ProductCatalogModal } from './product-catalog-modal';

export function InvoiceItem({
	data,
	item,
	index,
	onChange,
	locked,
	columns,
	singleColumn,
	itemPricePart,
	itemPricePartName,
}: {
	data: InvoiceData['items'];
	item: InvoiceData['items'][number];
	index: number;
	onChange: (data: Partial<InvoiceData>) => void;
	locked: boolean;
	columns: string;
	singleColumn: string;
	itemPricePart: string;
	itemPricePartName: string;
}) {
	const onChangeItem = (change: Partial<InvoiceData['items'][number]>) => {
		onChange({
			items: data?.map((i) => {
				if (i.id === item.id) {
					return {
						...i,
						...change,
					};
				}
				return i;
			}),
		});
	};

	const [showProductCatalog, hideProductCatalog] = useModal(() => (
		<ProductCatalogModal
			onClose={hideProductCatalog}
			onSelect={(productId, product) =>
				onChangeItem({
					...product,
					productId: product.id,
					id: Math.random().toString(),
				})
			}
		/>
	));

	return (
		<>
			<InvoiceItemDivider
				locked={locked}
				onAddItem={() => {
					onChange({
						items: [
							...(data || []).slice(0, index),
							{
								id: Math.random().toString(),
								name: '',
								description: '',
								price: '0.00',
								priceCents: 0,
								quantity: 0,
								taxPercentage: 0,
							},
							...(data || []).slice(index),
						],
					});
				}}
			/>
			<div className="relative">
				{locked ? null : (
					<InvoiceRowDeleteButton
						onClick={() => {
							onChange({
								items: [
									...(data || []).slice(0, index),
									...(data || []).slice(index + 1),
								],
							});
						}}
					/>
				)}
				{locked ? null : (
					<InvoiceLookupStartButton onClick={() => showProductCatalog()} />
				)}
				<div className={clsx(columns, 'grid py-3')} key={item.id}>
					<div className={clsx(singleColumn, 'mb-4 sm:mb-0')}>
						<div className="font-medium text-gray-900">
							<InlineEditableText
								empty="Item name"
								placeholder="Enter item name"
								value={item.name}
								onChange={(name) => {
									onChangeItem({ name });
								}}
								locked={locked}
							/>
						</div>
						<div className="text-gray-500">
							<InlineEditableText
								empty="Item description"
								placeholder="Enter item description"
								value={item.description}
								onChange={(description) => {
									onChangeItem({ description });
								}}
								locked={locked}
							/>
						</div>
					</div>
					<div className={clsx(singleColumn, itemPricePart, 'text-right')}>
						<div className={itemPricePartName}>Amount</div>
						<div>
							<InlineEditableText
								placeholder="Amount"
								value={item.quantity.toString()}
								textRight
								onChange={(quantity) => {
									onChangeItem({ quantity: quantity as unknown as number });
								}}
								locked={locked}
							/>
						</div>
					</div>
					<div className={clsx(singleColumn, itemPricePart, 'text-right')}>
						<div className={itemPricePartName}>Single Price</div>
						<div>
							<InlineEditableText
								placeholder="Price"
								value={item.price || API.centsToPrice(item.priceCents)}
								textRight
								postfix="€"
								onChange={(price) => {
									onChangeItem({
										priceCents: API.priceToCents(price),
										price,
									});
								}}
								locked={locked}
							/>
						</div>
					</div>
					<div className={clsx(singleColumn, itemPricePart, 'text-right')}>
						<div className={itemPricePartName}>Tax</div>
						<div>
							<InlineEditableText
								placeholder="Tax"
								value={item.taxPercentage.toString()}
								postfix="%"
								textRight
								onChange={(taxPercentage) => {
									onChangeItem({
										taxPercentage: taxPercentage as unknown as number,
									});
								}}
								locked={locked}
							/>
						</div>
					</div>
					<div className={clsx(singleColumn, itemPricePart, 'text-right')}>
						<div className={itemPricePartName}>Total</div>
						<div>
							{Number(
								((Number(item.priceCents) * Number(item.quantity)) / 100) *
									(1 + Number(item.taxPercentage) / 100),
							).toFixed(2)}{' '}
							€
						</div>
					</div>
				</div>
			</div>
		</>
	);
}

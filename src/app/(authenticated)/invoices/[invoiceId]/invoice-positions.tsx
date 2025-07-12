import clsx from 'clsx';

import { API } from '@/api/index';

import { InvoiceData } from './data';
import { InlineEditableText, InvoiceItemDivider } from './helpers';
import { InvoiceItem } from './invoice-item';

import {
	getInvoiceSubTotal,
	getInvoiceTaxTotal,
	getInvoiceTotal,
} from '@/common/invoice';
import { VatStatus } from '@/common/gql/graphql';

/**
 * InvoicePositions renders the invoice item table and summary.
 *
 * @param data - The invoice data, including items and totals.
 * @param onChange - Callback for when invoice data changes.
 * @param locked - Whether the invoice is locked for editing.
 * @param vatStatus - The VAT/tax status of the company (controls VAT column visibility).
 */
export function InvoicePositions({
	data,
	onChange,
	locked,
	vatStatus,
}: {
	data: InvoiceData;
	onChange: (data: Partial<InvoiceData>) => void;
	locked: boolean;
	vatStatus: string;
}) {
	const columns =
		vatStatus === VatStatus.VatEnabled
			? 'sm:grid-cols-[auto_60px_80px_50px_90px]'
			: 'sm:grid-cols-[auto_60px_80px_90px]';
	const singleColumn = 'col-span-1';
	const itemPricePart = 'grid grid-cols-[auto_90px]';
	const itemPricePartName = 'font-medium text-gray-900 sm:hidden';

	return (
		<div className="mt-16 w-full leading-6 text-sm text-gray-900">
			<div
				className={clsx(
					columns,
					'grid font-semibold py-3 grid-cols-[5fr_2.4fr]',
				)}
			>
				<div className={clsx(singleColumn)}>Item</div>
				<div className={clsx(singleColumn, 'text-right hidden sm:block')}>
					Amount
				</div>
				<div className={clsx(singleColumn, 'text-right hidden sm:block')}>
					Price
				</div>
				{vatStatus === 'VAT_ENABLED' && (
					<div className={clsx(singleColumn, 'text-right hidden sm:block')}>
						Tax
					</div>
				)}
				<div className={clsx(singleColumn, 'text-right')}>Total</div>
			</div>
			{data.items?.map((item, index) => (
				<InvoiceItem
					columns={columns}
					singleColumn={singleColumn}
					itemPricePart={`${itemPricePart} sm:block`}
					itemPricePartName={itemPricePartName}
					key={item.id}
					data={data.items}
					item={item}
					index={index}
					onChange={onChange}
					locked={locked}
					vatStatus={vatStatus}
				/>
			))}

			<InvoiceItemDivider
				locked={locked}
				onAddItem={() => {
					onChange({
						items: [
							...(data.items || []),
							{
								id: Math.random().toString(),
								name: '',
								description: '',
								price: '0.00',
								priceCents: 0,
								quantity: 0,
								taxPercentage: 0,
								linkedExpenses: [],
							},
						],
					});
				}}
			/>

			<div className="grid sm:grid-cols-2 pt-5 ">
				<div>
					<InlineEditableText
						placeholder={locked ? '' : 'Custom Footer Text'}
						value={data.footerText}
						onChange={(footerText) => {
							onChange({
								footerText,
							});
						}}
						locked={locked}
					/>
				</div>
				<div>
					<div className={clsx(itemPricePart, 'py-1')}>
						<div className="col-span-1 text-right">Subtotal</div>
						<div className="col-span-1 text-right">
							{API.centsToPrice(getInvoiceSubTotal(data))} €
						</div>
					</div>
					{vatStatus === 'VAT_ENABLED' && (
						<div className={clsx(itemPricePart, 'py-1')}>
							<div className="col-span-1 text-right">Tax</div>
							<div className="col-span-1 text-right">
								{API.centsToPrice(getInvoiceTaxTotal(data))} €
							</div>
						</div>
					)}
					<div className={clsx(itemPricePart, 'font-semibold py-1')}>
						<div className="col-span-1 text-right">Total</div>
						<div className="col-span-1 text-right">
							{API.centsToPrice(getInvoiceTotal(data))} €
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

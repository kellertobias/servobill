import {
	DocumentTextIcon,
	ReceiptPercentIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

import dayjs from 'dayjs';
import type React from 'react';
import { API } from '@/api/index';
import { InvoiceStatus, InvoiceType } from '@/common/gql/graphql';
import type { InvoiceListData } from '@/hooks/use-invoice-list';
import { getInvoiceStatusBadge } from './status-badges';
import { Table } from './table';

export function InvoicesTable({
	data,
	title,
	loading,
}: {
	data: InvoiceListData | undefined | null;
	title?: string | React.ReactNode;
	loading?: boolean;
}) {
	return (
		<Table
			data={data}
			loading={loading}
			title={title}
			keyField="id"
			getCategory={(data) =>
				dayjs(data.invoicedAt || data.createdAt).format('DD.MM.YYYY')
			}
			getLineLink={(data) => `/invoices/${data.id}`}
			columns={[
				{
					key: 'finances',
					title: 'Finances',
					className: 'py-5 pr-6',
					render: (invoice) => (
						<>
							<div
								className={clsx('flex gap-x-6', {
									'opacity-25': invoice.status === InvoiceStatus.Cancelled,
								})}
							>
								{invoice.type === InvoiceType.Invoice ? (
									<DocumentTextIcon
										className="hidden h-6 w-5 flex-none text-gray-400 sm:block"
										aria-hidden="true"
									/>
								) : (
									<ReceiptPercentIcon
										className="hidden h-6 w-5 flex-none text-gray-400 sm:block"
										aria-hidden="true"
									/>
								)}
								<div className="flex-auto">
									<div className="flex items-start gap-x-3">
										<div
											className={clsx(
												'text-sm font-medium leading-6 text-gray-900',
												{
													'opacity-50':
														invoice.status === InvoiceStatus.Cancelled,
												},
											)}
										>
											{API.centsToPrice(invoice.totalCents)} €
										</div>
										{getInvoiceStatusBadge(invoice)}
									</div>
									<div className="mt-1 text-xs leading-5 text-gray-500">
										<span className="block sm:hidden font-semibold">
											{invoice.customer.name}{' '}
										</span>
										{invoice.paidAt ? (
											<span>
												Paid At: {dayjs(invoice.paidAt).format('DD.MM.YYYY')}
											</span>
										) : invoice.dueAt ? (
											<span>
												Due At: {dayjs(invoice.dueAt).format('DD.MM.YYYY')}
											</span>
										) : null}
										{invoice.paidCents &&
										invoice.paidCents !== invoice.totalCents ? (
											<span>
												Already Paid: {API.centsToPrice(invoice.paidCents)} €
											</span>
										) : null}
									</div>
								</div>
							</div>
						</>
					),
				},
				{
					key: 'customer',
					title: 'Customer',
					className: 'hidden py-5 pr-6 sm:table-cell',
					render: (invoice) => (
						<div
							className={clsx({
								'opacity-25': invoice.status === InvoiceStatus.Cancelled,
							})}
						>
							<div className="text-sm font-medium leading-6 text-gray-900">
								{invoice.customer.name}
							</div>
							<div className="mt-1 text-xs leading-5 text-gray-500">
								{invoice.subject}
							</div>
						</div>
					),
				},
				{
					key: 'action',
					title: 'Action',
					className: 'py-5 text-right',
					render: (invoice) => (
						<div
							className={clsx({
								'opacity-25': invoice.status === InvoiceStatus.Cancelled,
							})}
						>
							<div className="flex justify-end">
								<a
									href={`/invoices/${invoice.id}`}
									className="text-sm font-medium leading-6 text-indigo-600 hover:text-indigo-500"
								>
									View
									<span className="hidden sm:inline">
										{' '}
										{invoice.type === InvoiceType.Invoice ? 'Invoice' : 'Offer'}
									</span>
									<span className="sr-only">
										, {invoice.invoiceNumber || invoice.offerNumber},{' '}
										{invoice.customer.name}
									</span>
								</a>
							</div>
							<div className="mt-1 text-xs leading-5 text-gray-500">
								<span className="text-gray-900">
									{invoice.invoiceNumber || invoice.offerNumber}
								</span>
							</div>
						</div>
					),
				},
			]}
		/>
	);
}

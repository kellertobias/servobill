'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

import { PageContent } from '@/components/page';
import { LoadingSkeleton } from '@/components/loading';
import { useHasChanges } from '@/hooks/load-data';
import { Button } from '@/components/button';
import { API, gql } from '@/api/index';
import { doToast } from '@/components/toast';
import { confirmDialog } from '@/components/dialog';

import { useInvoiceData, useInvoiceSettingsData } from './data';
import { InvoiceStatusPaid } from './invoice-status/invoice-status-paid';
import { InvoiceStatusSent } from './invoice-status/invoice-status-sent';
import { InvoiceStatusDraft } from './invoice-status/invoice-status-draft';
import { InvoiceStatusOfferSent } from './invoice-status/invoice-status-offer-sent';
import { InvoiceStatusOfferDraft } from './invoice-status/invoice-status-offer-draft';
import { InvoiceActivityFeed } from './invoice-activity';
import { InvoicePositions } from './invoice-positions';
import { InvoiceHeader } from './invoice-header';
import { InvoiceStatusCancelled } from './invoice-status/invoice-status-cancelled';

import { InvoiceStatus, InvoiceType, VatStatus } from '@/common/gql/graphql';

export default function InvoiceDetailPage() {
	const router = useRouter();
	const { data, initialData, setData, loading, reload } = useInvoiceData();
	const { data: settings } = useInvoiceSettingsData();

	const hasChanges = useHasChanges(data, initialData, (inv) => ({
		customer: {
			id: inv?.customer?.id,
		},
		offeredAt: inv?.offeredAt,
		invoicedAt: inv?.invoicedAt,
		dueAt: inv?.dueAt,
		subject: inv?.subject,
		footerText: inv?.footerText,
		items: inv?.items?.map((item) => ({
			id: item.id,
			name: item.name,
			description: item.description,
			priceCents: item.priceCents,
			quantity: item.quantity,
			taxPercentage: item.taxPercentage,
			linkedExpenses: item.linkedExpenses,
		})),
	}));

	if (loading) {
		return (
			<PageContent
				title={`Invoice: Loading...`}
				noPadding
				contentClassName="overflow-hidden pt-6"
			>
				<LoadingSkeleton />
			</PageContent>
		);
	}

	if (!data) {
		return (
			<PageContent
				title={`Invoice: Not Found`}
				noPadding
				contentClassName="overflow-hidden pt-6"
				notFound
			/>
		);
	}

	const locked = data.status !== InvoiceStatus.Draft;
	const name = data.type === InvoiceType.Invoice ? 'Invoice' : 'Offer';
	return (
		<PageContent
			title={
				data.type === InvoiceType.Invoice
					? `Invoice: ${data.invoiceNumber || 'Draft'}`
					: `Offer: ${data.offerNumber || 'Draft'}`
			}
			noPadding
			contentClassName="px-6 pt-6"
			footer={
				<>
					<div className="flex justify-center mt-6 gap-1 text-gray-500 text-xs">
						<a
							className="text-xs text-gray-500 hover:text-gray-900 cursor-pointer"
							onClick={async () => {
								if (
									(await confirmDialog({
										danger: true,
										title: `Delete ${name}?`,
										content: (
											<>
												Are you sure you want to delete this {name}? This action
												cannot be undone and does not yet delete the PDF files.
												Also, Invoice Numbers won't be reset.
											</>
										),
									})) &&
									(await new Promise<boolean>((resolve) =>
										setTimeout(() => resolve(true), 750),
									)) &&
									(await confirmDialog({
										danger: true,
										title: `Really Delete ${name}?`,
										content: (
											<>
												Sorry to annoy you with this again, but are you really
												sure? This action cannot be undone and might not be
												legal according to the tax law in your country.
											</>
										),
									}))
								) {
									doToast({
										promise: (async () => {
											await API.query({
												query: gql(`
														mutation DeleteInvoice($id: String!) {
															deleteInvoice(id: $id) {id}
														}
													`),
												variables: {
													id: data.id,
												},
											});
											router.push('/invoices');
										})(),
										loading: `Deleting ${name}...`,
										success: `${name} deleted`,
										error: `${name} could not be deleted`,
									});
								}
							}}
						>
							Delete {name}
						</a>
					</div>
				</>
			}
		>
			<div className="pb-16 ">
				<div className="mx-auto grid max-w-2xl grid-cols-1 grid-rows-1 items-start gap-x-8 gap-y-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
					{/* Invoice summary */}
					<div className="lg:col-start-3 lg:row-end-1">
						<h2 className="sr-only">Summary</h2>
						{(data.status === InvoiceStatus.Paid ||
							data.status === InvoiceStatus.PaidPartially) && (
							<InvoiceStatusPaid
								data={data}
								reload={reload}
								hasChanges={hasChanges}
							/>
						)}
						{data.type === InvoiceType.Invoice &&
							data.status === InvoiceStatus.Sent && (
								<InvoiceStatusSent
									data={data}
									reload={reload}
									hasChanges={hasChanges}
								/>
							)}
						{data.type === InvoiceType.Invoice &&
							data.status === InvoiceStatus.Draft && (
								<InvoiceStatusDraft
									data={data}
									reload={reload}
									hasChanges={hasChanges}
								/>
							)}
						{data.type === InvoiceType.Offer &&
							(data.status === InvoiceStatus.Sent ||
								data.status === InvoiceStatus.Cancelled) && (
								<InvoiceStatusOfferSent
									data={data}
									reload={reload}
									hasChanges={hasChanges}
								/>
							)}
						{data.type === InvoiceType.Offer &&
							data.status === InvoiceStatus.Draft && (
								<InvoiceStatusOfferDraft
									data={data}
									reload={reload}
									hasChanges={hasChanges}
								/>
							)}
						{data.status === InvoiceStatus.Cancelled && (
							<InvoiceStatusCancelled
								data={data}
								reload={reload}
								hasChanges={hasChanges}
							/>
						)}
					</div>

					{/* Invoice */}
					<div className="-mx-4  sm:mx-0  lg:col-span-2 lg:row-span-2 lg:row-end-2">
						<div
							className="
								px-4 py-8
								sm:mx-0 sm:px-8 sm:pb-14 xl:px-16 xl:pb-20 xl:pt-16
								shadow-sm ring-1 ring-gray-900/5 
								rounded-lg
							"
						>
							<h2 className="text-base font-semibold leading-6 text-gray-900">
								{data.type === InvoiceType.Invoice ? `Invoice` : `Offer`}
							</h2>
							<InvoiceHeader
								data={data}
								onChange={(changes) =>
									setData((current) => ({ ...current, ...changes }))
								}
								locked={locked}
							/>
							<InvoicePositions
								data={data}
								onChange={(changes) =>
									setData((current) => ({ ...current, ...changes }))
								}
								locked={locked}
								vatStatus={settings?.company?.vatStatus || VatStatus.VatEnabled}
							/>
						</div>
						<div className="mt-4 flex flex-row justify-end gap-2 text-right lg:-mb-12">
							{locked ? (
								<Button disabled={true} secondary>
									A sent invoice cannot be edited
								</Button>
							) : (
								<>
									{hasChanges && (
										<Button
											onClick={() => {
												setData(structuredClone(initialData));
											}}
											secondary
										>
											Revert Changes
										</Button>
									)}
									<Button
										onClick={async () => {
											const updateData = {
												customerId: data.customer.id,
												offeredAt: data.offeredAt,
												invoicedAt: data.invoicedAt,
												dueAt: data.dueAt,
												subject: data.subject,
												footerText: data.footerText,
												items: data.items.map((item) => ({
													productId: item.productId,
													name: item.name,
													description: item.description,
													priceCents: Number(item.priceCents),
													quantity: Number(item.quantity),
													taxPercentage: Number(item.taxPercentage || '0'),
													linkedExpenses: item.linkedExpenses.map(
														(expense) => ({
															name: expense.name,
															price: expense.price,
															categoryId: expense.categoryId || undefined,
															enabled: expense.enabled,
														}),
													),
												})),
											};

											doToast({
												promise: (async () => {
													await API.query({
														query: gql(`
														mutation UpdateInvoice($id: String!, $data: InvoiceInput!) {
															updateInvoice(id: $id, data: $data) {
																id
															}
														}
													`),
														variables: {
															id: data.id,
															data: updateData,
														},
													});
													reload();
												})(),
												loading: 'Saving Invoice...',
												success: 'Invoice saved',
												error: 'Invoice not saved',
											});
										}}
										disabled={!hasChanges}
										primary
									>
										{hasChanges ? 'Save Changes' : 'No Changes'}
									</Button>
								</>
							)}
						</div>
					</div>

					<div className="lg:col-start-3">
						{/* Activity feed */}
						<InvoiceActivityFeed />
					</div>
				</div>
			</div>
		</PageContent>
	);
}

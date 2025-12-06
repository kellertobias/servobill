import { CalendarDaysIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';

import { API } from '@/api/index';
import { InvoiceSubmissionType } from '@/common/gql/graphql';
import { getInvoiceTotal } from '@/common/invoice';
import { InvoiceStatusBadgeDraft } from '@/components/status-badges';
import type { InvoiceData } from '../data';
import { InvoiceActions } from './actions';
import { onClickInvoiceCopy } from './invoice-copy';
import { onClickDeleteDraft } from './invoice-delete-draft';
import { onClickDownloadInvoice } from './invoice-download';
import { onClickSendInvoice } from './invoice-submit';

export function InvoiceStatusOfferDraft({
	data,
	reload,
	hasChanges,
}: {
	data: InvoiceData;
	reload: () => void;
	hasChanges: boolean;
}) {
	const router = useRouter();

	return (
		<div className="rounded-lg bg-gray-50 shadow-sm ring-1 ring-gray-900/5">
			<dl className="flex flex-wrap">
				<div className="flex-auto pl-6 pt-6">
					<dt className="text-sm font-semibold leading-6 text-gray-900">
						Draft Offer Value
					</dt>
					<dd className="mt-1 text-base font-semibold leading-6 text-gray-900">
						{API.centsToPrice(getInvoiceTotal(data))} €
					</dd>
				</div>
				<div className="flex-none self-end px-6 pt-4">
					<dt className="sr-only">Status</dt>
					<InvoiceStatusBadgeDraft isOffer />
				</div>
				<div className="mt-6 flex w-full flex-none gap-x-4 border-t border-gray-900/5 px-6 pt-6">
					<dt className="flex-none">
						<span className="sr-only">Client</span>
						<UserCircleIcon
							className="h-6 w-5 text-gray-400"
							aria-hidden="true"
						/>
					</dt>
					<dd className="text-sm font-medium leading-6 text-gray-900">
						{data.customer?.name || 'Select a client'}
					</dd>
				</div>
				<div className="mt-4 flex w-full flex-none gap-x-4 px-6">
					<dt className="flex-none">
						<span className="sr-only">Created</span>
						<CalendarDaysIcon
							className="h-6 w-5 text-gray-400"
							aria-hidden="true"
						/>
					</dt>
					<dd className="text-sm leading-6 text-gray-500">
						<time dateTime="2023-01-31">
							Created {dayjs(data.createdAt).format('DD.MM.YYYY, HH:mm')}
						</time>
					</dd>
				</div>
				<InvoiceActions
					hasChanges={hasChanges}
					actions={[
						{
							name: 'Delete Draft',
							onClick: () => {
								onClickDeleteDraft({
									data,
									reload,
									isOffer: true,
									router,
								});
							},
						},
						{
							name: 'Download',
							onClick: () => {
								onClickDownloadInvoice({
									data,
								});
							},
						},
						{
							name: 'Copy',
							onClick: () => {
								onClickInvoiceCopy({
									data,
									isOffer: true,
									router,
								});
							},
						},
						{
							name: 'Mark as sent',
							onClick: async () => {
								onClickSendInvoice({
									submitType: InvoiceSubmissionType.Manual,
									data,
									reload,
									isOffer: true,
								});
							},
						},
						{
							name: 'Send',
							onClick: () => {
								onClickSendInvoice({
									submitType: InvoiceSubmissionType.Email,
									data,
									reload,
									isOffer: true,
								});
							},
							isPrimary: true,
						},
					]}
				/>
			</dl>
		</div>
	);
}

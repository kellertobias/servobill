import { useRouter } from 'next/navigation';

import { CalendarDaysIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';

import { API } from '@/api/index';
import {
	InvoiceStatusBadgeOffer,
	InvoiceStatusBadgeOfferCancelled,
} from '@/components/status-badges';

import { InvoiceData } from '../data';

import { InvoiceActions } from './actions';
import { onClickDownloadInvoice } from './invoice-download';
import { onClickSendInvoice } from './invoice-submit';
import { onClickCancelInvoice } from './invoice-cancel-unpaid';
import { onClickInvoiceCopy } from './invoice-copy';

import { InvoiceStatus, InvoiceSubmissionType } from '@/common/gql/graphql';

export function InvoiceStatusOfferSent({
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
						Sent Offer Value
					</dt>
					<dd className="mt-1 text-base font-semibold leading-6 text-gray-900">
						{API.centsToPrice(data.totalCents)} €
					</dd>
				</div>
				<div className="flex-none self-end px-6 pt-4">
					{data.status === InvoiceStatus.Cancelled ? (
						<InvoiceStatusBadgeOfferCancelled />
					) : (
						<InvoiceStatusBadgeOffer />
					)}
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
						{data.customer?.name}
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
							Offer sent {dayjs(data.offeredAt).format('DD.MM.YYYY, HH:mm')}
						</time>
					</dd>
				</div>
				<InvoiceActions
					hasChanges={hasChanges}
					actions={[
						{
							active: data.status !== InvoiceStatus.Cancelled,
							name: 'Discard Offer',
							onClick: () => {
								onClickCancelInvoice({
									data,
									reload,
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
							active: data.status !== InvoiceStatus.Cancelled,
							name: 'Send Again',
							onClick: () => {
								onClickSendInvoice({
									submitType: InvoiceSubmissionType.Email,
									data,
									reload,
									resend: true,
									isOffer: true,
								});
							},
						},
						{
							name:
								data.status === InvoiceStatus.Cancelled
									? 'Copy Offer'
									: 'Generate Invoice / Copy Offer',
							onClick: () => {
								onClickInvoiceCopy({
									data,
									isOffer: true,
									router,
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

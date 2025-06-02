import { useRouter } from 'next/navigation';

import { CalendarDaysIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';

import { API } from '@/api/index';

import { InvoiceData } from '../data';

import { InvoiceActions } from './actions';
import { onClickSendInvoice } from './invoice-submit';
import { onClickDownloadInvoice } from './invoice-download';
import { onClickInvoiceCopy } from './invoice-copy';

import { getInvoiceTotal } from '@/common/invoice';
import { InvoiceSubmissionType } from '@/common/gql/graphql';

export function InvoiceStatusCancelled({
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
						Value before cancellation
					</dt>
					<dd className="mt-1 text-base font-semibold leading-6 text-gray-900">
						{API.centsToPrice(getInvoiceTotal(data))} €
					</dd>
				</div>
				<div className="flex-none self-end px-6 pt-4">
					<dt className="sr-only">Status</dt>
					<span className="rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-600/20">
						Cancelled
					</span>
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
							name: 'Download',
							onClick: () => {
								onClickDownloadInvoice({
									data,
								});
							},
						},
						{
							name: 'Copy to Invoice/ Offer',
							onClick: () => {
								onClickInvoiceCopy({
									data,
									router,
								});
							},
						},
						{
							name: 'Send Again',
							onClick: async () => {
								onClickSendInvoice({
									submitType: InvoiceSubmissionType.Email,
									data,
									reload,
									resend: true,
								});
							},
						},
					]}
				/>
			</dl>
		</div>
	);
}

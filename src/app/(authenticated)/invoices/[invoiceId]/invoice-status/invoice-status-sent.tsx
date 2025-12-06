import { CalendarDaysIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';

import { API } from '@/api/index';
import { InvoiceSubmissionType } from '@/common/gql/graphql';
import { InvoiceStatusBadgeSent } from '@/components/status-badges';
import type { InvoiceData } from '../data';
import { InvoiceActions } from './actions';
import { onClickCancelInvoice } from './invoice-cancel-unpaid';
import { onClickInvoiceCopy } from './invoice-copy';
import { onClickDownloadInvoice } from './invoice-download';
import { onClickSendInvoice } from './invoice-submit';
import { onClickEnterPayment } from './payment-form';

export function InvoiceStatusSent({
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
          <dt className="text-sm font-semibold leading-6 text-gray-900">Invoiced Total</dt>
          <dd className="mt-1 text-base font-semibold leading-6 text-gray-900">
            {API.centsToPrice(data.totalCents)} €
          </dd>
        </div>
        <div className="flex-none self-end px-6 pt-4">
          <InvoiceStatusBadgeSent />
        </div>
        <div className="mt-6 flex w-full flex-none gap-x-4 border-t border-gray-900/5 px-6 pt-6">
          <dt className="flex-none">
            <span className="sr-only">Client</span>
            <UserCircleIcon className="h-6 w-5 text-gray-400" aria-hidden="true" />
          </dt>
          <dd className="text-sm font-medium leading-6 text-gray-900">
            {data.customer?.contactName}
          </dd>
        </div>
        <div className="mt-4 flex w-full flex-none gap-x-4 px-6">
          <dt className="flex-none">
            <span className="sr-only">Due date</span>
            <CalendarDaysIcon className="h-6 w-5 text-gray-400" aria-hidden="true" />
          </dt>
          <dd className="text-sm leading-6 text-gray-500">
            Due On {dayjs(data.dueAt).format('DD.MM.YYYY')}
          </dd>
        </div>
        <InvoiceActions
          hasChanges={hasChanges}
          actions={[
            {
              name: 'Cancel',
              onClick: async () => {
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
            {
              name: 'Enter Payment',
              onClick: () => {
                onClickEnterPayment({
                  data,
                  reload,
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

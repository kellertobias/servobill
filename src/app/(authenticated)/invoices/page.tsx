'use client';

import { PlusIcon } from '@heroicons/react/20/solid';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import React from 'react';
import { useModal } from 'react-modal-hook';
import { exportInvoices } from '@/api/import-export/invoices-export';
import { importInvoices } from '@/api/import-export/invoices-import';
import { API, gql } from '@/api/index';
import { Button } from '@/components/button';
import { InvoicesTable } from '@/components/invoices-table';
import { PageContent } from '@/components/page';
import { StatsDisplay, type StatsDisplayStat } from '@/components/stats';
import { useLoadData } from '@/hooks/load-data';
import { useInvoiceList } from '@/hooks/use-invoice-list';

import { NewInvoiceModal } from './new-invoice';

function InvoiceHomePageStats() {
  const router = useRouter();
  const { data, loading } = useLoadData(async () =>
    API.query({
      query: gql(`
				query InvoiceHomePageStatisticsData($startOfYear: DateTime!, $endOfYear: DateTime!, $startOfLastYear: DateTime!) {
					report: generateReport(where: {startDate: $startOfYear, endDate: $endOfYear}) {
						incomeCents
						surplusCents
						overdueCents
						overdueInvoices
						openCents
						openInvoices
					}
					reference: generateReport(where: {startDate: $startOfLastYear, endDate: $startOfYear}) {
						incomeCents
						surplusCents
						overdueCents
						overdueInvoices
						openCents
						openInvoices
					}
				}
			`),
      variables: {
        startOfYear: dayjs().subtract(1, 'year').toDate().toISOString(),
        endOfYear: dayjs().toDate().toISOString(),
        startOfLastYear: dayjs().subtract(2, 'year').toDate().toISOString(),
      },
    })
  );

  const stats: StatsDisplayStat[] = [
    {
      name: 'Open Invoices',
      value: `${API.centsToPrice(data?.report?.openCents)} €`,
      subValue: data?.report?.openInvoices || 0,
    },
    {
      name: 'Overdue Invoices',
      value: `${API.centsToPrice(data?.report?.overdueCents)} €`,
      subValue: data?.report?.overdueInvoices || 0,
    },
    {
      name: 'Yearly Revenue',
      value: `${API.centsToPrice(data?.report?.incomeCents)} €`,
      change: API.getChange(data?.report?.incomeCents, data?.reference?.incomeCents),
    },
    {
      name: 'Yearly Profit',
      value: `${API.centsToPrice(data?.report?.surplusCents)} €`,
      change: API.getChange(data?.report?.surplusCents, data?.reference?.surplusCents),
    },
  ];
  return <StatsDisplay stats={stats} loading={loading} onClick={() => router.push('/reports')} />;
}

export default function InvoiceHomePage() {
  const [showNewInvoiceModal, hideNewInvoiceModal] = useModal(() => (
    <NewInvoiceModal onClose={hideNewInvoiceModal} />
  ));

  const { data, loading, reload } = useInvoiceList();

  return (
    <PageContent
      title="Invoices"
      noPadding
      contentClassName="overflow-hidden"
      right={
        <>
          <Button icon={PlusIcon} header onClick={showNewInvoiceModal}>
            New Invoice
          </Button>
        </>
      }
      footer={
        <>
          <div className="flex justify-center mt-6 gap-1 text-gray-500 text-xs">
            <a
              className="text-xs text-gray-500 hover:text-gray-900 cursor-pointer"
              onClick={async () => {
                await importInvoices();
                // wait 3 seconds
                await new Promise((resolve) => setTimeout(resolve, 3000));
                reload();
              }}
            >
              Import from JSON
            </a>{' '}
            &bull;{' '}
            <a
              className="text-xs text-gray-500 hover:text-gray-900 cursor-pointer"
              onClick={async () => {
                await exportInvoices();
              }}
            >
              Export to JSON
            </a>
          </div>
        </>
      }
    >
      <InvoiceHomePageStats />
      <InvoicesTable data={data?.invoices} loading={loading} />
    </PageContent>
  );
}

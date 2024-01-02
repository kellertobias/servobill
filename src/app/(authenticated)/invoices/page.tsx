'use client';

import React from 'react';
import { useModal } from 'react-modal-hook';

import { PlusIcon } from '@heroicons/react/20/solid';
import dayjs from 'dayjs';

import { Button } from '@/components/button';
import { PageContent } from '@/components/page';
import { StatsDisplay, StatsDisplayStat } from '@/components/stats';
import { useLoadData } from '@/hooks/load-data';
import { API, gql } from '@/api/index';
import { useInvoiceList } from '@/hooks/use-invoice-list';
import { InvoicesTable } from '@/components/invoices-table';
import { exportInvoices, importInvoices } from '@/api/import';

import { NewInvoiceModal } from './new-invoice';

function InvoiceHomePageStats() {
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
				startOfYear: dayjs().startOf('year').toDate().toISOString(),
				endOfYear: dayjs().endOf('year').toDate().toISOString(),
				startOfLastYear: dayjs()
					.startOf('year')
					.subtract(1, 'year')
					.toDate()
					.toISOString(),
			},
		}),
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
			change: API.getChange(
				data?.reference?.incomeCents,
				data?.report?.incomeCents,
			),
		},
		{
			name: 'Yearly Profit',
			value: `${API.centsToPrice(data?.report?.surplusCents)} €`,
			change: API.getChange(
				data?.reference?.surplusCents,
				data?.report?.surplusCents,
			),
		},
	];
	return <StatsDisplay stats={stats} loading={loading} />;
}

export default function InvoiceHomePage() {
	const [showNewInvoiceModal, hideNewInvoiceModal] = useModal(() => (
		<NewInvoiceModal onClose={hideNewInvoiceModal} />
	));

	const pageSize = 10;
	const currentPage = React.useRef(0);

	const { data, loading, reload } = useInvoiceList({ pageSize, currentPage });

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
						{/* <a
							className="text-xs text-gray-500 hover:text-gray-900 cursor-pointer"
							onClick={async () => {
								await importInvoices();

								reload();
							}}
						>
							Import from JSON
						</a>{' '}
						&bull;{' '} */}
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

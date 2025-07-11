'use client';

import React from 'react';

import { stringify } from 'csv-stringify/sync';
import dayjs from 'dayjs';

import { PageCard, PageContent } from '@/components/page';
import { DateInput } from '@/components/date';
import { SettingsBlock } from '@/components/settings-block';
import { API, gql } from '@/api/index';
import { StatsDisplay, StatsDisplayStat } from '@/components/stats';
import { useLoadData } from '@/hooks/load-data';
import { Table } from '@/components/table';
import { Button } from '@/components/button';
import { downloadFile } from '@/api/import-export/helper';

function ReportPreview({ start, end }: { start?: string; end?: string }) {
	const { data, loading } = useLoadData(async () =>
		API.query({
			query: gql(`
				query ReportStatisticsData($startOfPeriod: DateTime!, $endOfPeriod: DateTime!, $startOfLastPeriod: DateTime!) {
					report: generateReport(where: {startDate: $startOfPeriod, endDate: $endOfPeriod}) {
						incomeCents
						expensesCents
						surplusCents
						overdueCents
						overdueInvoices
						openCents
						openInvoices
						invoiceTaxCents
						expensesTaxCents
						items {
							id
							type
							name
							description
							valutaDate
							surplusCents
							taxCents
							category {
								id
								name
								color
								description
							}
						}
					}
					reference: generateReport(where: {startDate: $startOfLastPeriod, endDate: $startOfPeriod}) {
						incomeCents
						expensesCents
						surplusCents
						overdueCents
						overdueInvoices
						openCents
						openInvoices
						invoiceTaxCents
						expensesTaxCents
					}
				}
			`),
			variables: {
				startOfPeriod: dayjs(start).toDate().toISOString(),
				endOfPeriod: dayjs(end).toDate().toISOString(),
				startOfLastPeriod: dayjs(start)
					.subtract(dayjs(end).diff(start, 'days'), 'days')
					.toDate()
					.toISOString(),
			},
		}),
	);

	const stats: StatsDisplayStat[] = [
		{
			name: 'Revenue',
			value: `${API.centsToPrice(data?.report?.incomeCents)} €`,
			change: API.getChange(
				data?.report?.incomeCents,
				data?.reference?.incomeCents,
			),
		},
		{
			name: 'Profit',
			value: `${API.centsToPrice(data?.report?.surplusCents)} €`,
			change: API.getChange(
				data?.report?.surplusCents,
				data?.reference?.surplusCents,
			),
		},
		data?.reference?.invoiceTaxCents != 0 || data?.report?.invoiceTaxCents != 0
			? {
					name: 'Invoiced Tax',
					value: `${API.centsToPrice(data?.report?.invoiceTaxCents)} €`,
					change: API.getChange(
						data?.report?.invoiceTaxCents,
						data?.reference?.invoiceTaxCents,
					),
				}
			: {
					name: 'Expenses',
					value: `${API.centsToPrice(data?.report?.expensesCents)} €`,
					change: API.getChange(
						data?.report?.expensesCents,
						data?.reference?.expensesCents,
					),
				},
		{
			name: 'Expended Tax',
			value: `${API.centsToPrice(data?.report?.expensesTaxCents)} €`,
			change: API.getChange(
				data?.report?.expensesTaxCents,
				data?.reference?.expensesTaxCents,
			),
		},
	];
	return (
		<>
			<PageCard>
				<StatsDisplay stats={stats} loading={loading} />
			</PageCard>
			<PageCard>
				<SettingsBlock
					title="Report Download"
					subtitle={
						<div className="prose prose-sm leading-4 text-xs text-gray-500/80">
							Here you can download the report in various file types
						</div>
					}
				>
					<div className="block sm:flex flex-row gap-4">
						<Button
							secondary
							onClick={() => {
								const content = stringify(data?.report?.items || []);
								downloadFile({
									content,
									filename: 'report.csv',
								});
							}}
						>
							Download as CSV
						</Button>
						<Button
							secondary
							onClick={() => {
								downloadFile({
									content: JSON.stringify({ ...data?.report, start, end }),
									filename: 'report.json',
								});
							}}
						>
							Download as JSON
						</Button>
						{/* <Button secondary onClick={() => {
							// Later
						}}>
							Download as PDF
						</Button> */}
					</div>
				</SettingsBlock>
			</PageCard>
			<PageCard noPadding className="pt-6">
				<Table
					title="Report Items"
					data={data?.report?.items || []}
					loading={loading}
					keyField="id"
					getCategory={(data) => dayjs(data.valutaDate).format('MMMM, YYYY')}
					columns={[
						{
							key: 'category',
							title: 'Category',
							className: 'py-5 w-24',
							render: (item) =>
								item.category ? (
									<span
										className="inline-flex items-center gap-x-1.5 rounded-full px-2 py-1 text-xs font-medium text-gray-900 ring-1 ring-inset ring-gray-200 w-20 justify-center overflow-clip text-ellipsis"
										title={item.category.description || item.category.name}
									>
										<svg
											viewBox="0 0 6 6"
											aria-hidden="true"
											className="w-1.5 h-1.5"
											style={{ fill: item.category.color || '#888' }}
										>
											<circle r={3} cx={3} cy={3} />
										</svg>
										{item.category.name}
									</span>
								) : null,
						},
						{
							key: 'name',
							title: 'Name',
							className: 'py-5',
							render: (item) => (
								<>
									<div className="text-sm font-medium leading-6 text-gray-900">
										{item.name}
									</div>
									<div className="mt-1 text-xs leading-5 text-gray-500">
										<span className="text-gray-900 truncate">
											{dayjs(item.valutaDate).format('DD.MM.YYYY')}
										</span>
									</div>
								</>
							),
						},
						{
							key: 'description',
							title: 'Description',
							className: 'py-5',
							render: (item) => (
								<>
									<div className="mt-1 text-xs leading-5 text-gray-500">
										<span className="text-gray-900 truncate">
											{item.description}
										</span>
									</div>
								</>
							),
						},
						{
							key: 'action',
							title: 'Action',
							className: 'py-5 text-right',
							render: (item) => (
								<>
									<div className="flex justify-end">
										<span className="text-sm font-medium leading-6 text-indigo-600 hover:text-indigo-500">
											{item.type === 'invoice' ? 'Invoice' : 'Expense'}
										</span>
									</div>
									<div className="mt-1 text-xs leading-5 text-gray-500">
										<span className="text-gray-900">
											{API.centsToPrice(item.surplusCents)} €
										</span>
									</div>
									{item.taxCents ? (
										<div className="mt-1 text-xs leading-5 text-gray-500">
											<span className="text-gray-900">
												{API.centsToPrice(item.taxCents)} € Tax
											</span>
										</div>
									) : null}
								</>
							),
						},
					]}
				/>
			</PageCard>
		</>
	);
}

export default function ReportHomePage() {
	const [startDate, setStartDate] = React.useState<string>();
	const [endDate, setEndDate] = React.useState<string>();
	return (
		<>
			<PageContent title="Report Builder" noCard contentClassName="pt-6">
				<PageCard>
					<SettingsBlock
						title="Date Range"
						subtitle={
							<div className="prose prose-sm leading-4 text-xs text-gray-500/80">
								Select the start and end dates for the report you want to
								generate.
								<br />
								Quick Range select:{' '}
								<a
									onClick={() => {
										// eslint-disable-next-line unicorn/no-useless-undefined
										setStartDate(undefined);
										// eslint-disable-next-line unicorn/no-useless-undefined
										setEndDate(undefined);
										setTimeout(() => {
											setStartDate(
												dayjs().startOf('year').format('YYYY-MM-DD'),
											);
											setEndDate(dayjs().endOf('year').format('YYYY-MM-DD'));
										}, 100);
									}}
									className="text-blue-600 hover:text-blue-500 no-underline cursor-pointer"
								>
									This Year
								</a>{' '}
								&bull;{' '}
								<a
									onClick={() => {
										// eslint-disable-next-line unicorn/no-useless-undefined
										setStartDate(undefined);
										// eslint-disable-next-line unicorn/no-useless-undefined
										setEndDate(undefined);
										setTimeout(() => {
											setStartDate(
												dayjs()
													.startOf('year')
													.subtract(1, 'year')
													.format('YYYY-MM-DD'),
											);
											setEndDate(dayjs().startOf('year').format('YYYY-MM-DD'));
										}, 100);
									}}
									className="text-blue-600 hover:text-blue-500 no-underline cursor-pointer"
								>
									Last Year
								</a>{' '}
								&bull;{' '}
								<a
									onClick={() => {
										// eslint-disable-next-line unicorn/no-useless-undefined
										setStartDate(undefined);
										// eslint-disable-next-line unicorn/no-useless-undefined
										setEndDate(undefined);
										setTimeout(() => {
											setStartDate(
												dayjs().subtract(365, 'days').format('YYYY-MM-DD'),
											);
											setEndDate(dayjs().format('YYYY-MM-DD'));
										}, 100);
									}}
									className="text-blue-600 hover:text-blue-500 no-underline cursor-pointer"
								>
									Last 365 days
								</a>{' '}
								&bull;{' '}
								<a
									onClick={() => {
										// eslint-disable-next-line unicorn/no-useless-undefined
										setStartDate(undefined);
										// eslint-disable-next-line unicorn/no-useless-undefined
										setEndDate(undefined);
										setTimeout(() => {
											setStartDate(
												dayjs()
													.startOf('month')
													.subtract(1, 'month')
													.format('YYYY-MM-DD'),
											);
											setEndDate(dayjs().startOf('month').format('YYYY-MM-DD'));
										}, 100);
									}}
									className="text-blue-600 hover:text-blue-500 no-underline cursor-pointer"
								>
									Last Month
								</a>{' '}
								&bull;{' '}
								<a
									onClick={() => {
										// eslint-disable-next-line unicorn/no-useless-undefined
										setStartDate(undefined);
										// eslint-disable-next-line unicorn/no-useless-undefined
										setEndDate(undefined);
										setTimeout(() => {
											setStartDate(
												dayjs().startOf('month').format('YYYY-MM-DD'),
											);
											setEndDate(dayjs().format('YYYY-MM-DD'));
										}, 100);
									}}
									className="text-blue-600 hover:text-blue-500 no-underline cursor-pointer"
								>
									This Month
								</a>
							</div>
						}
					>
						<div className="block sm:grid grid-cols-3 gap-4">
							<DateInput
								label="Start Date"
								value={startDate}
								onChange={setStartDate}
								placeholder="Select Start Date"
							/>
							<DateInput
								label="End Date"
								value={endDate}
								onChange={setEndDate}
								placeholder="Select End Date"
							/>
							<div className="pt-8 flex flex-row gap-2">
								<div>
									<Button
										onClick={() => {
											// eslint-disable-next-line unicorn/no-useless-undefined
											setStartDate(undefined);
											// eslint-disable-next-line unicorn/no-useless-undefined
											setEndDate(undefined);
											setTimeout(() => {
												setStartDate(startDate);
												setEndDate(endDate);
											}, 50);
										}}
										secondary
									>
										Load
									</Button>
								</div>
							</div>
						</div>
					</SettingsBlock>
				</PageCard>
				{startDate?.trim() && endDate?.trim() ? (
					<ReportPreview start={startDate} end={endDate} />
				) : (
					<PageCard>
						<div className="text-center text-sm text-gray-400">
							Once you have selected the date range, you see a preview of the
							report here.
						</div>
					</PageCard>
				)}
			</PageContent>
		</>
	);
}

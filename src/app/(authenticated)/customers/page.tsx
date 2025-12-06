'use client';

import { PlusIcon } from '@heroicons/react/20/solid';
import React from 'react';
import {
	exportCustomers,
	importCustomers,
} from '@/api/import-export/customers';
import { API, gql } from '@/api/index';
import { Button } from '@/components/button';
import { PageContent } from '@/components/page';
import { Table } from '@/components/table';
import { useLoadData } from '@/hooks/load-data';

import CustomerOverlay from './customer-overlay';

export default function CustomersHomePage() {
	const [selectedCustomerId, setSelectedCustomerId] = React.useState<
		null | string
	>(null);

	const { data, loading, reload } = useLoadData(async () => {
		const data = await API.query({
			query: gql(`
				query CustomersHomePageListData {
					customers {
						id
						customerNumber
						name
						contactName
						email
						street
						zip
						city
						notes
					}
				}
			`),
		}).then((res) => res.customers);
		return data;
	});

	return (
		<>
			{selectedCustomerId && (
				<CustomerOverlay
					customerId={selectedCustomerId}
					onClose={(reloadData?: boolean) => {
						setSelectedCustomerId(null);
						if (reloadData) {
							reload();
						}
					}}
					openCreated={(id) => {
						setSelectedCustomerId(id);
					}}
				/>
			)}
			<PageContent
				title="Customers"
				noPadding
				contentClassName="overflow-hidden pt-6"
				right={
					<>
						<Button
							icon={PlusIcon}
							header
							onClick={() => setSelectedCustomerId('new')}
						>
							New Customer
						</Button>
					</>
				}
				footer={
					<>
						<div className="flex justify-center mt-6 gap-1 text-gray-500 text-xs">
							<a
								className="text-xs text-gray-500 hover:text-gray-900 cursor-pointer"
								onClick={async () => {
									await importCustomers();

									reload();
								}}
							>
								Import from JSON
							</a>{' '}
							&bull;{' '}
							<a
								className="text-xs text-gray-500 hover:text-gray-900 cursor-pointer"
								onClick={async () => {
									await exportCustomers();
								}}
							>
								Export to JSON
							</a>
						</div>
					</>
				}
			>
				<Table
					title="Customers"
					data={data}
					loading={loading}
					keyField="id"
					getCategory={(data) => data?.name?.charAt(0).toUpperCase()}
					getLineLink={(data) => () => setSelectedCustomerId(data.id)}
					columns={[
						{
							key: 'name',
							title: 'Name',
							className: 'py-5',
							render: (customer) => (
								<>
									<div className="text-sm font-medium leading-6 text-gray-900">
										{customer.name}
									</div>
									<div className="mt-1 text-xs leading-5 text-gray-500">
										<span className="text-gray-900">
											{customer.contactName}
										</span>
									</div>
								</>
							),
						},
						{
							key: 'address',
							title: 'Address',
							className: 'py-5',
							render: (customer) => (
								<>
									<div className="text-xs leading-6 text-gray-500">
										{customer.street}, {customer.zip} {customer.city}
										<br />
										{customer.email}
									</div>
								</>
							),
						},
						{
							key: 'action',
							title: 'Action',
							className: 'py-5 text-right',
							render: (customer) => (
								<>
									<div className="flex justify-end">
										<a
											onClick={() => setSelectedCustomerId(customer.id)}
											className="text-sm font-medium leading-6 text-indigo-600 hover:text-indigo-500"
										>
											View
											<span className="hidden sm:inline">Customer</span>
										</a>
									</div>
									<div className="mt-1 text-xs leading-5 text-gray-500">
										<span className="text-gray-900">
											{customer.customerNumber}
										</span>
									</div>
								</>
							),
						},
					]}
				/>
			</PageContent>
		</>
	);
}

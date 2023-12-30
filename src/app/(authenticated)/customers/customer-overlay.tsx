import React from 'react';

import { useLoadData, useSaveCallback } from '@/hooks/load-data';
import { API, gql } from '@/api/index';
import { Drawer } from '@/components/drawer';
import { Input } from '@/components/input';
import { LoadingSkeleton } from '@/components/loading';
import { Toggle } from '@/components/toggle';

export default function CustomerOverlay({
	customerId,
	onClose,
	openCreated,
}: {
	customerId: string;
	onClose: (reload?: boolean) => void;
	openCreated: (id: string) => void;
}) {
	const { data, setData, initialData, reload } = useLoadData(
		async ({ customerId }) =>
			customerId === 'new'
				? {
						id: 'new',
						name: '',
						contactName: '',
						customerNumber: '',
						email: '',
						street: '',
						zip: '',
						city: '',
						country: '',
						state: '',
						notes: '',
						showContact: false,
					}
				: API.query({
						query: gql(`
							query CustomerDetailPageData($id: String!) {
								customer(id: $id) {
									id
									name
									contactName
									customerNumber
									email
									street
									zip
									city
									country
									state
									notes
									showContact
								}
							}
						`),
						variables: {
							id: customerId,
						},
					}).then((res) => res.customer),
		{ customerId },
	);

	const { onSave } = useSaveCallback({
		id: customerId,
		entityName: 'Customer',
		data,
		initialData,
		openCreated,
		reload,
	});

	return (
		<Drawer
			id={customerId}
			title={customerId === 'new' ? 'New Customer' : 'Edit Customer'}
			subtitle={initialData?.name}
			onClose={onClose}
			onSave={async () => {
				await onSave?.();
				onClose(true);
			}}
			deleteText={{
				title: 'Delete Customer',
				content: (
					<>
						Are you sure you want to delete the customer <b>{data?.name}</b>?
						This action cannot be undone.
						<br />
						Invoices and Offers related to this customer will not be deleted.
					</>
				),
			}}
			onDelete={
				customerId === 'new'
					? undefined
					: async () => {
							await API.query({
								query: gql(`
						mutation DeleteCustomer($id: String!) {
							deleteCustomer(id: $id) {id}
						}
					`),
								variables: {
									id: customerId,
								},
							});
							onClose(true);
						}
			}
		>
			{data ? (
				<>
					<div className="divide-y divide-gray-200 px-4 sm:px-6">
						<div className="space-y-6 pb-5 pt-6">
							<Input
								placeholder="Will be generated automatically if left empty"
								className="col-span-full"
								label="Customer Number"
								value={data.customerNumber}
								onChange={(customerNumber) => {
									setData((prev) => ({ ...prev, customerNumber }));
								}}
								displayFirst
							/>

							<Input
								className="col-span-full"
								label="Company Name"
								value={data.name}
								onChange={(name) => {
									setData((prev) => ({ ...prev, name }));
								}}
								displayFirst
							/>

							<Input
								className="col-span-4"
								label="Contact Name"
								value={data.contactName}
								onChange={(contactName) => {
									setData((prev) => ({ ...prev, contactName }));
								}}
								displayFirst
							/>

							<Toggle
								label="Show Contact on Letters"
								value={data.showContact}
								onChange={(showContact) => {
									setData((prev) => ({ ...prev, showContact }));
								}}
							/>

							<Input
								className="col-span-6"
								label="E-Mail"
								type="email"
								value={data.email}
								onChange={(email) => {
									setData((prev) => ({ ...prev, email }));
								}}
								displayFirst
							/>

							<Input
								className="col-span-6"
								label="Street & No."
								value={data.street}
								onChange={(street) => {
									setData((prev) => ({ ...prev, street }));
								}}
								displayFirst
							/>

							<Input
								className="col-span-2"
								label="ZIP"
								value={data.zip}
								onChange={(zip) => {
									setData((prev) => ({ ...prev, zip }));
								}}
								displayFirst
							/>

							<Input
								className="col-span-4"
								label="City"
								value={data.city}
								onChange={(city) => {
									setData((prev) => ({ ...prev, city }));
								}}
								displayFirst
							/>

							<Input
								className="col-span-3"
								label="Country"
								value={data.country}
								onChange={(country) => {
									setData((prev) => ({ ...prev, country }));
								}}
								displayFirst
							/>
							<Input
								className="col-span-3"
								label="State"
								value={data.state}
								onChange={(state) => {
									setData((prev) => ({ ...prev, state }));
								}}
								displayFirst
							/>
							<Input
								className="col-span-4"
								label="Notes (Private)"
								value={data.notes}
								onChange={(notes) => {
									setData((prev) => ({ ...prev, notes }));
								}}
								textarea
								displayFirst
							/>
						</div>
					</div>
				</>
			) : (
				<LoadingSkeleton />
			)}
		</Drawer>
	);
}

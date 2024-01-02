/* eslint-disable @typescript-eslint/no-explicit-any */

import { doToast } from '@/components/toast';

import { API, gql } from '../index';

import { downloadFile, requestFile } from './helper';

import { Customer } from '@/common/gql/graphql';

export type InNinContact = {
	first_name: string;
	last_name: string;
	email: string;
};

export type InNinCustomer = {
	id: string;
	hashed_id: string;
	number: string;
	name: string;
	address1: string;
	postal_code: string;
	city: string;
	country_id: number;
	state: string;
};

export const findInNinContact = (
	contacts: InNinContact[] | undefined,
	customer: InNinCustomer,
): InNinContact | undefined =>
	(contacts || []).find(
		(contact) =>
			`${contact.first_name} ${contact.last_name}`.trim() ===
			customer.name.trim(),
	);

export const mapInNinCustomer = (
	customer: InNinCustomer & Partial<Customer>,
	contacts?: InNinContact[],
): Omit<Customer, 'createdAt' | 'id' | 'updatedAt'> => {
	const contact = findInNinContact(contacts, customer);
	return {
		customerNumber: customer.customerNumber || customer.number,
		name: customer.name,
		contactName:
			customer.contactName ||
			(contact ? `${contact.first_name} ${contact.last_name}` : ''),
		email: customer.email || contact?.email || '',
		showContact: customer.showContact || true,
		street: customer.street || customer.address1,
		zip: customer.zip || customer.postal_code,
		city: customer.city,
		country:
			customer.country ||
			(customer.country_id == 276 ? 'Germany' : `${customer.country_id}`),
		state: customer.state,
	};
};

export const importSingleCustomer = async (
	customer: Omit<Customer, 'createdAt' | 'id' | 'updatedAt'>,
) => {
	const customerData = { ...customer };
	delete (customerData as { hashed_id?: string }).hashed_id;
	return await API.query({
		query: gql(`
			mutation ImportCustomer($data: CustomerInput!) {
				createCustomer(data: $data) {
					id
					name
					showContact
					contactName
					customerNumber
					email
					street
					zip
					city
					country
					state
				}
			}
		`),
		variables: {
			data: customerData,
		},
	}).then((res) => res?.createCustomer);
};

export const importCustomers = async () => {
	const raw = await requestFile();
	doToast({
		promise: (async () => {
			const data = JSON.parse(raw || '{}');
			const customers = data?.clients || data?.customers || [];

			for (const customer of customers) {
				importSingleCustomer(mapInNinCustomer(customer, data?.client_contacts));
			}
		})(),
		loading: 'Importing Customers...',
		success: 'Customers Imported!',
		error: 'Failed to import your Customers.',
	});
};

export const exportCustomers = async () => {
	doToast({
		promise: (async () => {
			const { customers } = await API.query({
				query: gql(`
					query ExportCustomers {
						customers {
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
			});

			const data = {
				customers,
			};

			const dataStr = JSON.stringify(data);
			downloadFile({
				content: dataStr,
				filename: 'customers.json',
			});
		})(),
		loading: 'Exporting Customers...',
		success: 'Customers Exported!',
		error: 'Failed to export your Customers.',
	});
};

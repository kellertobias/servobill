import { API, gql } from '../index';

import {
	InNinContact,
	InNinCustomer,
	importSingleCustomer,
	mapInNinCustomer,
} from './customers';

import { Customer, Invoice } from '@/common/gql/graphql';

type InNinInvoice = {
	id?: string;
	client_id?: string;
	hashed_id?: string;
	is_deleted?: boolean;
	line_items?: {
		cost?: number;
		line_total?: string;
		product_key?: string;
		notes?: string;
		quantity: number;
	}[];
	date?: string; // YYYY-MM-DD
	due_date?: string; // YYYY-MM-DD
	footer?: string;
	terms?: string;
	number?: string;
	paid_to_date?: string;
};

export type InvoiceDataType = Partial<Omit<Invoice, 'customer'>> &
	InNinInvoice & {
		customer?: { id?: string };
		client: Omit<Customer, 'createdAt' | 'id' | 'updatedAt'>;
	};

const loadCustomers = async (needsCustomers: boolean) => {
	if (!needsCustomers) {
		return [];
	}
	const { customers } = await API.query({
		query: gql(`
			query LoadAllCustomersForInvoiceImport {
				customers {
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
	});
	return customers;
};

export type LoadInvoiceImportData = Omit<InvoiceDataType, 'customer'> & {
	customer: { id: string };
};

export const loadInvoiceImportData = async (data: {
	clients?: InNinCustomer[];
	client_contacts?: InNinContact[];
	invoices?: (InNinInvoice | Partial<Invoice>)[];
}): Promise<LoadInvoiceImportData[]> => {
	// Get Invoices
	const invoices = ((data?.invoices || []) as InvoiceDataType[]).filter(
		(invoice) => {
			if (invoice.is_deleted) {
				return false;
			}

			return true;
		},
	);

	console.log(invoices);

	// Get Customers
	const customersImport = ((data?.clients || []) as InNinCustomer[]).map(
		(cus) => ({
			...mapInNinCustomer(cus, (data?.client_contacts || []) as InNinContact[]),
			hashed_id: cus.hashed_id,
		}),
	);

	const needsCustomers = invoices.some(
		(inv: { customer?: { id?: string } }) => inv.customer?.id === undefined,
	);

	const customers = await loadCustomers(needsCustomers);

	// Import customers that are not in the database yet
	for (const customer of customersImport) {
		if (
			!customers.some(
				(cus: { customerNumber?: string; name?: string }) =>
					cus.customerNumber === customer.customerNumber ||
					cus.name === customer.name,
			)
		) {
			const importedCustomer = await importSingleCustomer(customer);
			if (!importedCustomer) {
				throw new Error(
					`Failed to import customer ${
						customer.customerNumber || customer.name
					}`,
				);
			}
			customers.push(importedCustomer);
		}
	}

	// Map Customers to invoice
	for (const invoice of invoices) {
		if (invoice.client_id) {
			const client = customersImport.find(
				(cus) => cus.hashed_id === invoice.client_id,
			);
			if (!client) {
				throw new Error(
					`Client ${invoice.client_id} for invoice ${invoice.id} not found`,
				);
			}
			invoice.client = client;
		}
		const customerId =
			invoice.customer?.id ||
			customers.find((cus) => {
				if (cus.customerNumber === invoice.client_id) {
					return true;
				}
				if (
					cus.name === invoice.client.name &&
					cus.street === invoice.client.street &&
					cus.zip === invoice.client.zip
				) {
					return true;
				}
			})?.id;
		if (!customerId) {
			throw new Error(
				`Customer ${invoice.client_id} for invoice ${invoice.id} not imported`,
			);
		}
		invoice.customer = { id: customerId };
	}

	return invoices as LoadInvoiceImportData[];
};

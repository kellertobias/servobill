import { API, gql } from '../index';

import { importSingleCustomer } from './customers';

import {
	Customer,
	Invoice,
	InvoiceImportInput,
	InvoiceStatus,
	InvoiceType,
} from '@/common/gql/graphql';

const loadCustomers = async () => {
	const { customers } = await API.query({
		query: gql(`
			query LoadAllCustomersForInvoiceImport {
				customers {
					id
					customerNumber
				}
			}
		`),
	});
	return customers;
};

export const loadInvoiceImportData = async (data: {
	invoices?: Partial<Invoice>[];
}): Promise<InvoiceImportInput[]> => {
	// Get Invoices that are not deleted
	const invoices = ((data?.invoices || []) as Partial<Invoice>[]).filter(
		(invoice) => {
			if (invoice.status === InvoiceStatus.Cancelled) {
				return false;
			}

			return true;
		},
	);

	// Get customers from invoices
	const invoiceCustomerNumbers = new Set<string>();
	const invoiceCustomers = invoices
		.map((inv) => inv.customer)
		.filter((c) => {
			if (!c) {
				return false;
			}
			if (invoiceCustomerNumbers.has(c.customerNumber)) {
				return false;
			}
			invoiceCustomerNumbers.add(c.customerNumber);
			return true;
		}) as Customer[];

	// Get Existing Customers
	const existingCustomers = await loadCustomers();
	const existingCustomerNumbers = new Set<string>(
		existingCustomers.map((c) => c.customerNumber),
	);

	const customersToCreate = invoiceCustomers.filter(
		(c) => !existingCustomerNumbers.has(c.customerNumber),
	);

	// now create the customers and add them to the existing customers
	for (const customer of customersToCreate) {
		const importedCustomer = await importSingleCustomer(customer);
		if (!importedCustomer) {
			throw new Error(`Failed to import customer ${customer.customerNumber}`);
		}
		existingCustomers.push(importedCustomer);
	}

	// now generate the data for invoice import
	const invoicesToImport: InvoiceImportInput[] = [];
	for (const invoice of invoices) {
		const customer = existingCustomers.find(
			(cus) => cus.customerNumber === invoice.customer?.customerNumber,
		);

		if (!customer) {
			throw new Error(
				`Customer ${invoice.customer?.customerNumber} for invoice ${invoice.id} not found`,
			);
		}

		invoicesToImport.push({
			customerId: customer.id,
			type: invoice.type || InvoiceType.Invoice,
			...(invoice.invoiceNumber
				? { invoiceNumber: invoice.invoiceNumber }
				: {}),
			...(invoice.offerNumber ? { offerNumber: invoice.offerNumber } : {}),
			...(invoice.dueAt ? { dueAt: invoice.dueAt } : {}),
			...(invoice.invoicedAt ? { invoicedAt: invoice.invoicedAt } : {}),
			...(invoice.offeredAt ? { offeredAt: invoice.offeredAt } : {}),
			...(invoice.paidAt ? { paidAt: invoice.paidAt } : {}),
			paidCents: invoice.paidCents,
			paidVia: invoice.paidVia,
			footerText: invoice.footerText,
			status: invoice.status || InvoiceStatus.Draft,
			subject: invoice.subject,
			items: (invoice.items || []).map((item) => ({
				name: item.name,
				description: item.description,
				quantity: item.quantity || 1,
				priceCents: item.priceCents || 0,
				taxPercentage: item.taxPercentage || 0,
				linkedExpenses: item.linkedExpenses || [],
			})),
		});
	}

	return invoicesToImport;
};

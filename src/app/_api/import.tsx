/* eslint-disable @typescript-eslint/no-explicit-any */
import dayjs from 'dayjs';

import { doToast } from '@/components/toast';

import { API, gql } from '.';

const requestFile = async () => {
	return new Promise<string | null>((resolve) => {
		const input = document.createElement('input');
		input.type = 'file';

		input.addEventListener('change', (e) => {
			// getting a hold of the file reference
			const file = (e.target as HTMLInputElement)?.files?.[0];
			if (!file) {
				return resolve(null);
			}
			// setting up the reader
			const reader = new FileReader();
			reader.readAsText(file, 'utf8');

			// here we tell the reader what to do when it's done reading...
			reader.addEventListener('load', (readerEvent): void => {
				const content = readerEvent.target?.result; // this is the content!
				if (typeof content !== 'string') {
					return resolve(null);
				}
				resolve(content);
			});
		});

		input.click();
	});
};

export const importCustomers = async () => {
	const raw = await requestFile();
	doToast({
		promise: (async () => {
			const data = JSON.parse(raw || '{}');
			const customers = data?.clients || data?.customers || [];

			for (const customer of customers) {
				const contacts = data?.client_contacts?.filter(
					(contact: any) => contact.client_id === customer.hashed_id,
				);
				const contact = contacts?.[0] || {};
				await API.query({
					query: gql(`
                mutation ImportCustomer($data: CustomerInput!) {
                    createCustomer(data: $data) {
                        id
                    }
                }
            `),
					variables: {
						data: {
							customerNumber: customer.customerNumber || customer.number,
							name: customer.name,
							contactName:
								customer.contactName ||
								(contact ? `${contact.first_name} ${contact.last_name}` : ''),
							email: customer.email || contact.email || '',
							showContact: customer.showContact || true,
							street: customer.street || customer.address1,
							zip: customer.zip || customer.postal_code,
							city: customer.city,
							country:
								customer.country ||
								(customer.country_id == 276
									? 'Germany'
									: `${customer.country_id}`),
							state: customer.state,
						},
					},
				});
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
			const dataUri =
				'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

			const exportFileDefaultName = 'customers.json';

			const linkElement = document.createElement('a');
			linkElement.setAttribute('href', dataUri);
			linkElement.setAttribute('download', exportFileDefaultName);
			linkElement.click();
		})(),
		loading: 'Exporting Customers...',
		success: 'Customers Exported!',
		error: 'Failed to export your Customers.',
	});
};

export const importProducts = async () => {
	const raw = await requestFile();
	doToast({
		promise: (async () => {
			const data = JSON.parse(raw || '{}');
			const products = data?.products || [];

			for (const product of products) {
				await API.query({
					query: gql(`
				mutation ImportProduct($data: ProductInput!) {
					createProduct(data: $data) {
						id
					}
				}
			`),
					variables: {
						data: {
							name: product.name || product.product_key,
							category: product.category || 'Generic',
							description:
								(product.product_key ? product.notes : product.description) ||
								'',
							notes: (product.product_key ? '' : product.notes) || '',
							priceCents: product.priceCents || API.priceToCents(product.price),
							taxPercentage: product.taxPercentage || 0,
						},
					},
				});
			}
		})(),
		loading: 'Importing Products...',
		success: 'Products Imported!',
		error: 'Failed to import your Products.',
	});
};

export const exportProducts = async () => {
	doToast({
		promise: (async () => {
			const { products } = await API.query({
				query: gql(`
			query ExportProducts {
				products {
					id
					name
					category
					description
					notes
					priceCents
					taxPercentage
					createdAt
					updatedAt
				}
			}
		`),
			});

			const data = {
				products,
			};

			const dataStr = JSON.stringify(data);
			const dataUri =
				'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

			const exportFileDefaultName = 'products.json';

			const linkElement = document.createElement('a');
			linkElement.setAttribute('href', dataUri);
			linkElement.setAttribute('download', exportFileDefaultName);
			linkElement.click();
		})(),
		loading: 'Exporting Products...',
		success: 'Products Exported!',
		error: 'Failed to export your Products.',
	});
};

export const importExpenses = async () => {
	const raw = await requestFile();
	doToast({
		promise: (async () => {
			const data = JSON.parse(raw || '{}');
			const expenses = data?.expenses || [];
			for (const expense of expenses) {
				if (expense.deleted_at) {
					continue;
				}
				await API.query({
					query: gql(`
				mutation ImportExpense($data: ExpenseInput!) {
					createExpense(data: $data) {
						id
					}
				}
			`),
					variables: {
						data: {
							name:
								expense.name ||
								`${expense.public_notes}`.trim().slice(0, 64) ||
								`Expense ${expense.date}`,
							description: expense.description || expense.public_notes || '',
							notes: expense.notes || expense.private_notes || '',
							expendedCents:
								expense.expendedCents || API.priceToCents(expense.amount),
							expendedAt:
								expense.expendedAt ||
								dayjs(
									expense.payment_date || expense.date,
									'YYYY-MM-DD',
								).toDate(),
							taxCents: expense.taxCents || 0,
						},
					},
				});
			}
		})(),
		loading: 'Importing Expenses...',
		success: 'Expenses Imported!',
		error: 'Failed to import your Expenses.',
	});
};
export const exportExpenses = async () => {
	doToast({
		promise: (async () => {
			const { expenses } = await API.query({
				query: gql(`
			query ExportExpenses {
				expenses {
					id
					name
					description
					notes
					expendedCents
					expendedAt
					taxCents
					createdAt
					updatedAt
				}
			}
		`),
			});

			const data = {
				expenses,
			};

			const dataStr = JSON.stringify(data);
			const dataUri =
				'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

			const exportFileDefaultName = 'expenses.json';

			const linkElement = document.createElement('a');
			linkElement.setAttribute('href', dataUri);
			linkElement.setAttribute('download', exportFileDefaultName);
			linkElement.click();
		})(),
		loading: 'Exporting Expenses...',
		success: 'Expenses Exported!',
		error: 'Failed to export your Expenses.',
	});
};

export const importSettings = async () => {
	const raw = await requestFile();
	const data = JSON.parse(raw || '{}');
	console.log(data);
	doToast({
		promise: (async () =>
			await API.query({
				query: gql(`
				mutation ImportSettings($settings: SettingsInput!, $template: InvoiceTemplateInput!) {
					updateSettings(data: $settings) {
						invoiceNumbersLast
					}
					updateTemplate(data: $template) {
						pdfStyles
					}
				}
			`),
				variables: data,
			}))(),
		loading: 'Importing Settings...',
		success: 'Settings Imported!',
		error: 'Failed to import your Settings.',
	});
};

export const exportSettings = async () => {
	doToast({
		promise: (async () => {
			const data = await API.query({
				query: gql(`
			query ExportSettings {
				settings {
					invoiceNumbersTemplate
					invoiceNumbersIncrementTemplate
					invoiceNumbersLast
					offerNumbersTemplate
					offerNumbersIncrementTemplate
					offerNumbersLast
					customerNumbersTemplate
					customerNumbersIncrementTemplate
					customerNumbersLast
					emailTemplate
					emailSubjectInvoices
					emailSubjectOffers
					emailSubjectReminder
					emailSubjectWarning
					sendFrom
					replyTo
					invoiceCompanyLogo
					emailCompanyLogo
					offerValidityDays
					defaultInvoiceDueDays
					defaultInvoiceFooterText
					company {
						name
						street
						zip
						city
						taxId
						vatId
						email
						phone
						web
						bankAccountHolder
						bankIban
						bankBic
					}
				}
				template {
					pdfTemplate
					pdfStyles
				}
			}
		`),
			});

			const dataStr = JSON.stringify(data);
			const dataUri =
				'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

			const exportFileDefaultName = 'settings.json';

			const linkElement = document.createElement('a');
			linkElement.setAttribute('href', dataUri);
			linkElement.setAttribute('download', exportFileDefaultName);
			linkElement.click();
		})(),
		loading: 'Exporting Settings...',
		success: 'Settings Exported!',
		error: 'Failed to export your Settings.',
	});
};

export const exportInvoices = async () => {
	doToast({
		promise: (async () => {
			const { invoices } = await API.query({
				query: gql(`
					query ExportInvoices {
						invoices {
							id
							invoiceNumber
							offerNumber
							invoicedAt
							offeredAt
							dueAt
							status
							type
							subject
							footerText
							customer {
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
							items {
								id
								name
								description
								quantity
								priceCents
								taxPercentage
							}
							createdAt
							updatedAt
						}
					}
				`),
			});

			const data = {
				invoices,
			};

			const dataStr = JSON.stringify(data);
			const dataUri =
				'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

			const exportFileDefaultName = 'invoices.json';

			const linkElement = document.createElement('a');
			linkElement.setAttribute('href', dataUri);
			linkElement.setAttribute('download', exportFileDefaultName);
			linkElement.click();
		})(),
		loading: 'Exporting Invoices...',
		success: 'Invoices Exported!',
		error: 'Failed to export your Invoices.',
	});
};

export const importInvoices = async () => {
	const raw = await requestFile();
	const data = JSON.parse(raw || '{}');
	console.log(data);
};

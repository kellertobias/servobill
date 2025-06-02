import { API, gql } from '@/api/index';

export class Exporters {
	static async invoices() {
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
                            linkedExpenses {
                                name
                                price
                                categoryId
                                enabled
                                expenseId
                            }
                        }
                        createdAt
                        updatedAt
                    }
                }
            `),
		});
		return invoices;
	}

	static async expenses() {
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
                        categoryId
                    }
                }
            `),
		});

		return expenses;
	}
	static async customers() {
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

		return customers;
	}

	static async products() {
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
                        expenses {
                            name
                            price
                            categoryId
                        }
                    }
                }
            `),
		});

		return products;
	}

	static async settings() {
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
                        categories {
                            id
                            name
                            description
                            color
                            reference
                        }
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

		return data;
	}
}

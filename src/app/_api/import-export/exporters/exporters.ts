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
                        paidAt
                        paidCents
                        paidVia
                        customer {
                            id
                            name
                            contactName
                            customerNumber
                            email
                            street
                            zip
                            city
                            countryCode
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
                        activity {
                            id
                            activityAt
                            type
                            user
                            notes
                            attachToEmail
                            attachment {
                                id
                                fileName
                                mimeType
                                size
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
							countryCode
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

  static async inventory() {
    // Fetch all types
    const typesRes = await API.query({
      query: gql(`
                query ExportAllInventoryTypes {
                    inventoryTypes {
                        id
                        name
                        checkInterval
                        checkType
                        properties
                        parent
                        createdAt
                        updatedAt
                    }
                }
            `),
    });

    // Fetch all locations
    const locationsRes = await API.query({
      query: gql(`
                query ExportAllInventoryLocations {
                    inventoryLocations { 
                        id
                        name
                        barcode
                        parent
                        createdAt
                        updatedAt
                    }
                }
            `),
    });

    // Fetch all items
    const itemsRes = await API.query({
      query: gql(`
                query ExportAllInventoryItems {
                    inventoryItems {
                        id
                        name
                        barcode
                        state
                        typeId
                        locationId
                        nextCheck
                        lastScanned
                        createdAt
                        updatedAt
                        history {
                            type
                            state
                            date
                            note
                        }
                    }
                }
            `),
    });

    return {
      types: typesRes.inventoryTypes,
      locations: locationsRes.inventoryLocations,
      items: itemsRes.inventoryItems,
    };
  }
}

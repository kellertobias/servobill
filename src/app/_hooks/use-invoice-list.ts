import { API, gql } from '@/api/index';

import { useLoadData } from './load-data';

export const useInvoiceList = () =>
  useLoadData(async () =>
    API.query({
      query: gql(`
                query InvoiceHomePageListData {
                    invoices {
                        id
                        invoiceNumber
                        offerNumber
                        type
                        status
                        customer {
                            name
                            contactName
                        }
                        totalCents
                        paidCents
                        createdAt
                        invoicedAt
                        dueAt
                        paidAt
                        subject
                    }
                }
            `),
    })
  );

export type InvoiceListData = NonNullable<ReturnType<typeof useInvoiceList>['data']>['invoices'];

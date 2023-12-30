import { API, gql } from '@/api/index';

import { useLoadData } from './load-data';

export const useInvoiceList = ({
	pageSize,
	currentPage,
}: {
	pageSize: number;
	currentPage: { current: number };
}) =>
	useLoadData(async () =>
		API.query({
			query: gql(`
        query InvoiceHomePageListData($skip: Int!, $pageSize: Int!) {
            invoices(limit: $pageSize, skip: $skip) {
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
			variables: {
				skip: currentPage.current * pageSize,
				pageSize,
			},
		}),
	);

export type InvoiceListData = NonNullable<
	ReturnType<typeof useInvoiceList>['data']
>['invoices'];

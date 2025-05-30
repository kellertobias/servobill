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
        query InvoiceHomePageListData($skip: Int!, $limit: Int!) {
            invoices(skip: $skip, limit: $limit) {
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
				limit: pageSize,
			},
		}),
	);

export type InvoiceListData = NonNullable<
	ReturnType<typeof useInvoiceList>['data']
>['invoices'];

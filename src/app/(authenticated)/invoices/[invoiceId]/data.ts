import { API, gql } from '@/api/index';
import { useLoadData } from '@/hooks/load-data';

export const useInvoiceData = () =>
	useLoadData(async (params) =>
		API.query({
			query: gql(`
				query InvoicePageData($id: String!) {
					invoice(id: $id) {
						id
						invoiceNumber
						offerNumber
						type
						status
						customer {
							id
							name
							contactName
							street
							zip
							city
							state
							country
							showContact
							email
						}
						totalCents
						totalTax
						paidCents
						createdAt
						updatedAt
						offeredAt
						invoicedAt
						footerText
						dueAt
						paidAt
						paidVia
						subject
						items {
							id
							productId
							name
							description
							quantity
							priceCents
							taxPercentage
							expenseId
						}
					}
				}
			`),
			variables: {
				id: params.invoiceId,
			},
		}).then((data) => ({
			...(data as any).invoice,
			items: (data as any).invoice.items.map((item: any) => ({
				...item,
				price: API.centsToPrice(item.priceCents),
				expenseId: item.expenseId,
			})),
		})),
	);

export type InvoiceData = NonNullable<
	ReturnType<typeof useInvoiceData>['data']
>;

export const useInvoiceActivity = () =>
	useLoadData(async (params) =>
		API.query({
			query: gql(`
				query InvoicePageActivityData($id: String!) {
					invoice(id: $id) {
						activity {
							id
							activityAt
							type
							user
							notes
						}
					}
				}
			`),
			variables: {
				id: params.invoiceId,
			},
		}).then((data) => data.invoice?.activity),
	);

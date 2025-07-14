import React from 'react';

import { API, gql } from '@/api/index';
import { doToast } from '@/components/toast';
import { useLoadData } from '@/hooks/load-data';
import { confirmDialog } from '@/components/dialog';

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
							countryCode
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
							linkedExpenses {
								name
								price
								categoryId
								enabled
								expenseId
							}
						}
					}
				}
			`),
			variables: {
				id: params.invoiceId,
			},
		}).then((data) => ({
			...data.invoice,
			items: data.invoice.items.map((item) => ({
				...item,
				price: API.centsToPrice(item.priceCents),
				linkedExpenses: (item.linkedExpenses || []).map((expense) => ({
					...expense,
				})),
			})),
		})),
	);

export const useInvoiceSettingsData = () =>
	useLoadData(async () =>
		API.query({
			query: gql(`
				query GetSettingsVatStatus {
					settings { company { vatStatus } }
				}
			`),
		}).then((data) => data.settings),
	);

export type InvoiceData = NonNullable<
	ReturnType<typeof useInvoiceData>['data']
>;

export const useInvoiceActivity = () => {
	const { data, reload } = useLoadData(async (params) =>
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
							attachment {
								id
								fileName
								mimeType
								size
							}
							attachToEmail
						}
					}
				}
			`),
			variables: {
				id: params.invoiceId,
			},
		}).then((data) => ({
			activity: data.invoice?.activity,
			id: params.invoiceId,
		})),
	);

	/**
	 * Toggles the attachToEmail flag for an attachment activity.
	 * Calls the setInvoiceActivityAttachmentEmailFlag mutation.
	 */
	const toggleAttachToEmail = React.useCallback(
		async ({
			invoiceId,
			activityId,
			attachToEmail,
		}: {
			invoiceId: string;
			activityId: string;
			attachToEmail: boolean;
		}) => {
			await doToast({
				promise: API.query({
					query: gql(`
				mutation SetInvoiceActivityAttachmentEmailFlag($invoiceId: String!, $activityId: String!, $attachToEmail: Boolean!) {
					setInvoiceActivityAttachmentEmailFlag(invoiceId: $invoiceId, activityId: $activityId, attachToEmail: $attachToEmail) {
						id
					}
				}
			`),
					variables: { invoiceId, activityId, attachToEmail },
				}),
				loading: attachToEmail
					? 'Enabling email attachment...'
					: 'Disabling email attachment...',
				success: 'Attachment email flag updated!',
				error: 'Failed to update email attachment flag.',
			});
			reload();
		},
		[reload],
	);

	const cancelScheduledSend = React.useCallback(async () => {
		await doToast({
			promise: API.query({
				query: gql(`
					mutation AbortScheduledSend($id: String!) {
						cancelScheduledInvoiceSend(id: $id) {
							id
						}
					}
				`),
				variables: { id: data?.id },
			}),
			loading: 'Cancelling scheduled send...',
			success: 'Scheduled send cancelled!',
			error: 'Failed to cancel scheduled send.',
		});
		reload();
	}, [reload, data?.id]);

	/**
	 * Deletes an attachment activity (and the linked file).
	 * Calls the deleteInvoiceAttachmentActivity mutation.
	 */
	const deleteAttachmentActivity = React.useCallback(
		async ({
			invoiceId,
			activityId,
		}: {
			invoiceId: string;
			activityId: string;
		}) => {
			if (
				!(await confirmDialog({
					danger: true,
					title: `Delete attachment?`,
					content: `
						Are you sure you want to delete this attachment? This action
						cannot be undone.
					`,
				}))
			) {
				return;
			}
			await doToast({
				promise: API.query({
					query: gql(`
				mutation DeleteInvoiceAttachmentActivity($invoiceId: String!, $activityId: String!) {
					deleteInvoiceAttachmentActivity(invoiceId: $invoiceId, activityId: $activityId) {
						id
					}
				}
			`),
					variables: { invoiceId, activityId },
				}),
				loading: 'Deleting attachment...',
				success: 'Attachment deleted!',
				error: 'Failed to delete attachment.',
			});
			reload();
		},
		[reload],
	);

	return {
		data: data?.activity,
		reload,
		toggleAttachToEmail,
		deleteAttachmentActivity,
		cancelScheduledSend,
	};
};

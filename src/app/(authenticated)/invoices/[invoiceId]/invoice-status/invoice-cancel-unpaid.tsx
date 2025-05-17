import { confirmDialog } from '@/components/dialog';
import { doToast } from '@/components/toast';
import { API, gql } from '@/api/index';

import { InvoiceData } from '../data';

export const onClickCancelInvoice = async (props: {
	data: InvoiceData;
	reload: () => void;
	isOffer?: boolean;
}) => {
	// Check if any invoice items have a linked expense
	const hasLinkedExpenses = props.data.items.some(
		(item: any) => !!item.expenseId,
	);

	let cancelExpenses = false;
	if (hasLinkedExpenses && !props.isOffer) {
		cancelExpenses = (await confirmDialog({
			primary: true,
			title: 'Cancel Linked Expenses?',
			content: (
				<>
					This invoice has linked expenses. Do you also want to cancel (delete)
					the expenses that were created from this invoice?
				</>
			),
		})) as boolean;
	}

	if (
		await confirmDialog({
			primary: true,
			title: props.isOffer ? 'Cancel Offer?' : 'Cancel Invoice?',
			content: props.isOffer ? (
				<>This will mark the offer as invalid and cannot be undone.</>
			) : (
				<>This will generate a cancel notice and cannot be undone.</>
			),
		})
	) {
		doToast({
			promise: (async () => {
				await API.query({
					query: gql(`
						mutation CancelInvoice($id: String!) {
							invoiceCancelUnpaid(id: $id) {id}
						}
					`),
					variables: {
						id: props.data.id,
					},
				});
				props.reload();
			})(),
			loading: props.isOffer ? 'Cancelling offer...' : 'Cancelling invoice...',
			success: props.isOffer ? 'Offer cancelled.' : 'Invoice cancelled.',
			error: props.isOffer
				? 'Failed to cancel offer.'
				: 'Failed to cancel invoice.',
		});
	}
};

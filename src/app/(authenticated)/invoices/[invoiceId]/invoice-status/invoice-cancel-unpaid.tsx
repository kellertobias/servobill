import { confirmDialog } from '@/components/dialog';
import { doToast } from '@/components/toast';
import { API, gql } from '@/api/index';

import { InvoiceData } from '../data';

export const onClickCancelInvoice = async (props: {
	data: InvoiceData;
	reload: () => void;
	isOffer?: boolean;
}) => {
	console.log({ props });
	/**
	 * Checks if any invoice items have a linked expense and prompts the user
	 * whether to delete those expenses when cancelling the invoice.
	 */
	const hasLinkedExpenses = props.data.items.some(
		(item) => !!item.linkedExpenses?.some((expense) => !!expense.expenseId),
	);

	let cancelExpenses = false;
	if (hasLinkedExpenses && !props.isOffer) {
		// Ask the user if they want to delete linked expenses
		cancelExpenses = (await confirmDialog({
			danger: true,
			title: 'Cancel Linked Expenses?',
			confirmText: 'Also Delete Expenses',
			cancelText: 'Keep Expenses',
			content: (
				<>
					This invoice has linked expenses. Do you also want to cancel (delete)
					the expenses that were created from this invoice?
				</>
			),
		})) as boolean;
	}

	// Confirm invoice cancellation
	if (
		await confirmDialog({
			danger: true,
			title: props.isOffer ? 'Cancel Offer?' : 'Cancel Invoice?',
			confirmText: props.isOffer ? 'Cancel Offer' : 'Cancel Invoice',
			cancelText: 'Abort',
			content: props.isOffer ? (
				<>This will mark the offer as invalid and cannot be undone.</>
			) : (
				<>This will generate a cancel notice and cannot be undone.</>
			),
		})
	) {
		doToast({
			promise: (async () => {
				/**
				 * Calls the backend mutation to cancel the invoice. If the user opted to delete linked expenses,
				 * the deleteExpenses flag is set to true, ensuring all linked expenses are deleted server-side.
				 */
				await API.query({
					// The mutation now includes the deleteExpenses variable to control expense deletion
					query: gql(`
						mutation CancelInvoice($id: String!, $deleteExpenses: Boolean) {
							invoiceCancelUnpaid(id: $id, deleteExpenses: $deleteExpenses) {id}
						}
					`),
					variables: {
						id: props.data.id,
						deleteExpenses: cancelExpenses,
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

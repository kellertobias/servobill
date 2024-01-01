import { useRouter } from 'next/navigation';

import { confirmDialog } from '@/components/dialog';
import { doToast } from '@/components/toast';
import { API, gql } from '@/api/index';

import { InvoiceData } from '../data';

export const onClickDeleteDraft = async (props: {
	data: InvoiceData;
	reload: () => void;
	isOffer?: boolean;
	router: ReturnType<typeof useRouter>;
}) => {
	if (
		await confirmDialog({
			danger: true,
			title: props.isOffer ? 'Delete Draft Offer?' : 'Delete Draft Invoice?',
			content: 'This action cannot be undone.',
		})
	) {
		doToast({
			promise: (async () => {
				await API.query({
					query: gql(`
						mutation InvoiceDeleteDraft($id: String!) {
							invoiceDeleteDraft(id: $id) {id}
						}
					`),
					variables: {
						id: props.data.id,
					},
				});
				props.router.push('/invoices');
			})(),
			loading: 'Deleting draft...',
			success: 'Draft deleted.',
			error: 'Failed to delete draft.',
		});
	}
};

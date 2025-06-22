import React from 'react';

import { SparklesIcon } from '@heroicons/react/20/solid';

import { AttachmentFilePartial } from '@/api/download-attachment';
import { API, gql } from '@/api/index';
import { doToast } from '@/components/toast';

/**
 * Handles the AI extraction process
 * Triggers the extractReceipt GraphQL mutation and shows appropriate feedback
 */
export const useHandleExtractExpenses = (onClose: () => void) => {
	const [isExtracting, setIsExtracting] = React.useState(false);

	const handleClose = React.useCallback(() => {
		setIsExtracting(false);
		onClose();
	}, [onClose]);

	const callback = React.useCallback(
		async (attachments: AttachmentFilePartial[]) => {
			if (attachments.length === 0) {
				return;
			}

			setIsExtracting(true);

			try {
				// Extract all attachment IDs
				const attachmentIds = attachments.map((attachment) => attachment.id);

				await API.query({
					query: gql(`
						mutation ExtractReceiptFromAttachments($input: ExtractReceiptInput!) {
							extractReceipt(input: $input) {
								eventIds
								message
							}
						}
					`),
					variables: {
						input: {
							attachmentIds,
						},
					},
				});

				// Show success toast
				doToast({
					icon: SparklesIcon,
					title: 'Extraction Started',
					message:
						attachments.length === 1
							? 'Your receipt is being processed. You will receive an email summary once the extraction is complete.'
							: `${attachments.length} receipts are being processed. You will receive an email summary once the extraction is complete.`,
					type: 'success',
					duration: 5000,
				});

				// Close modal and reset state
				onClose();
				setIsExtracting(false);
			} catch (error) {
				console.error('Extraction failed:', error);

				// Show error toast
				doToast({
					title: 'Extraction Failed',
					message:
						error instanceof Error
							? error.message
							: 'An unexpected error occurred during extraction.',
					type: 'danger',
					duration: 5000,
				});

				setIsExtracting(false);
			}
		},
		[onClose],
	);

	return {
		isExtracting,
		callback,
		handleClose,
	};
};

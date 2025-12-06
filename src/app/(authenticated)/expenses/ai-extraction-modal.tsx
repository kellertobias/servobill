'use client';

import { Dialog as HeadlessDialog, Transition } from '@headlessui/react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import React, { Fragment, useState } from 'react';
import type { AttachmentFilePartial } from '@/api/download-attachment';
import { AttachmentDropzone } from '@/components/attachment-dropzone';
import { Button } from '@/components/button';

import { useHandleExtractExpenses } from './handle-expenses';

/**
 * Props for the AI extraction modal component
 */
interface AIExtractionModalProps {
	/**
	 * Whether the modal is open
	 */
	isOpen: boolean;
	/**
	 * Callback when the modal is closed
	 */
	onClose: () => void;
	/**
	 * Callback when extraction is completed (to reload data)
	 */
	onExtractionComplete?: () => void;
}

/**
 * Modal component for AI-powered expense extraction from receipts and invoices.
 *
 * This component provides a user interface for uploading receipt files and
 * triggering AI-powered expense extraction. The extraction process is handled
 * asynchronously by the backend, and users receive email notifications when
 * the process is complete.
 */
export default function AIExtractionModal({
	isOpen,
	onClose,
}: AIExtractionModalProps) {
	const [attachments, setAttachments] = useState<AttachmentFilePartial[]>([]);
	const onCloseInner = React.useCallback(() => {
		setAttachments([]);
		onClose();
	}, [onClose]);
	const {
		isExtracting,
		callback: handleExtractExpenses,
		handleClose,
	} = useHandleExtractExpenses(onCloseInner);

	return (
		<Transition.Root show={isOpen} as={Fragment}>
			<HeadlessDialog as="div" className="relative z-50" onClose={handleClose}>
				<Transition.Child
					as={Fragment}
					enter="ease-out duration-300"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="ease-in duration-200"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity backdrop-blur" />
				</Transition.Child>

				<div className="fixed inset-0 z-10 w-screen overflow-y-auto">
					<div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0 w-full">
						<Transition.Child
							as={Fragment}
							enter="ease-out duration-300"
							enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
							enterTo="opacity-100 translate-y-0 sm:scale-100"
							leave="ease-in duration-200"
							leaveFrom="opacity-100 translate-y-0 sm:scale-100"
							leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
						>
							<HeadlessDialog.Panel className="relative transform rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 w-full sm:max-w-lg">
								<div className="px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
									<div className="sm:flex sm:items-start">
										<div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 sm:mx-0 sm:h-10 sm:w-10">
											<SparklesIcon
												className="h-6 w-6 text-purple-600"
												aria-hidden="true"
											/>
										</div>
										<div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
											<HeadlessDialog.Title
												as="h3"
												className="text-base font-semibold leading-6 text-gray-900"
											>
												AI Expense Extraction
											</HeadlessDialog.Title>
											<div className="mt-2">
												<p className="text-sm text-gray-500 mb-4">
													Upload one or more receipts or invoices to
													automatically extract expense information using AI.
													The extraction process may take some time, and you
													will receive a summary of the extracted expenses by
													email once the process is complete.
												</p>

												<AttachmentDropzone
													value={attachments}
													onChange={setAttachments}
													maxSize={10 * 1024 * 1024} // 10MB
													accept={[
														'image/png',
														'image/jpeg',
														'image/gif',
														'application/pdf',
													]}
												/>
											</div>
										</div>
									</div>
								</div>
								<div className="px-4 py-3 flex flex-col sm:flex-row-reverse sm:px-6 gap-2">
									<Button
										onClick={() => handleExtractExpenses(attachments)}
										disabled={attachments.length === 0 || isExtracting}
										loading={isExtracting}
										primary
									>
										<SparklesIcon className="h-4 w-4 mr-2" />
										Extract Expenses with AI
									</Button>
									<Button onClick={handleClose} secondary>
										Cancel
									</Button>
								</div>
							</HeadlessDialog.Panel>
						</Transition.Child>
					</div>
				</div>
			</HeadlessDialog>
		</Transition.Root>
	);
}

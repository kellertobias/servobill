import clsx from 'clsx';
import React from 'react';
import { useParams } from 'next/navigation';

import {
	CheckCircleIcon,
	EnvelopeIcon,
	PaperClipIcon,
	PlusCircleIcon,
	TrashIcon,
	UserCircleIcon,
} from '@heroicons/react/20/solid';
import relativeTime from 'dayjs/plugin/relativeTime';
import dayjs from 'dayjs';

import { Button } from '@/components/button';
import { useAutoSizeTextArea } from '@/hooks/use-auto-textarea';
import { doToast } from '@/components/toast';
import { API, gql } from '@/api/index';

import { AttachmentFilePartial } from '@/app/_components/attachment-dropzone-upload';

import { useInvoiceActivity } from './data';

import { InvoiceActivityType } from '@/common/gql/graphql';
dayjs.extend(relativeTime);

// Local interfaces for GraphQL mutation results
interface RequestUploadResult {
	requestUpload: { uploadUrl: string; attachmentId: string };
}
interface ConfirmUploadResult {
	confirmUpload: AttachmentFilePartial;
}

const getActivityIcon = (type: InvoiceActivityType) => {
	switch (type) {
		case InvoiceActivityType.Imported: {
			return (
				<PlusCircleIcon className="h-6 w-6 text-gray-600" aria-hidden="true" />
			);
		}
		case InvoiceActivityType.CreatedInvoice:
		case InvoiceActivityType.CreatedOffer: {
			return (
				<PlusCircleIcon className="h-6 w-6 text-gray-600" aria-hidden="true" />
			);
		}
		case InvoiceActivityType.CancelOffer:
		case InvoiceActivityType.CancelInvoice: {
			return <TrashIcon className="h-6 w-6 text-red-600" aria-hidden="true" />;
		}
		case InvoiceActivityType.SentInvoiceEmail:
		case InvoiceActivityType.SentInvoiceLetter:
		case InvoiceActivityType.SentOfferEmail:
		case InvoiceActivityType.SentOfferLetter: {
			return (
				<EnvelopeIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
			);
		}
		case InvoiceActivityType.SentInvoiceManually:
		case InvoiceActivityType.SentOfferManually: {
			return (
				<EnvelopeIcon className="h-4 w-4 text-blue-600" aria-hidden="true" />
			);
		}
		case InvoiceActivityType.EmailSent: {
			return (
				<EnvelopeIcon className="h-4 w-4 text-green-600" aria-hidden="true" />
			);
		}
		case InvoiceActivityType.EmailDelivered: {
			return (
				<EnvelopeIcon className="h-4 w-4 text-green-600" aria-hidden="true" />
			);
		}
		case InvoiceActivityType.EmailBounced: {
			return (
				<EnvelopeIcon className="h-4 w-4 text-red-600" aria-hidden="true" />
			);
		}
		case InvoiceActivityType.Payment: {
			return (
				<CheckCircleIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
			);
		}
		case InvoiceActivityType.Paid: {
			return (
				<CheckCircleIcon
					className="h-6 w-6 text-green-600"
					aria-hidden="true"
				/>
			);
		}
		default: {
			return (
				<div className="h-1.5 w-1.5 rounded-full bg-gray-100 ring-1 ring-gray-300" />
			);
		}
	}
};

const getActivityText = (
	type: InvoiceActivityType,
	user: string | null | undefined,
	notes: string | null | undefined,
) => {
	switch (type) {
		case InvoiceActivityType.Imported: {
			return (
				<>
					<span className="font-medium text-gray-900">{user}</span> imported the
					invoice.
				</>
			);
		}
		case InvoiceActivityType.CreatedInvoice: {
			return (
				<>
					<span className="font-medium text-gray-900">{user}</span> created the
					invoice.
				</>
			);
		}

		case InvoiceActivityType.CreatedOffer: {
			return (
				<>
					<span className="font-medium text-gray-900">{user}</span> created the
					offer.
				</>
			);
		}

		case InvoiceActivityType.ConvertToInvoice: {
			return (
				<>
					<span className="font-medium text-gray-900">{user}</span> converted
					the offer to an invoice.
				</>
			);
		}

		case InvoiceActivityType.SentInvoiceEmail: {
			return (
				<>
					<span className="font-medium text-gray-900">{user}</span> triggered
					the invoice to be sent via email to the client.
				</>
			);
		}

		case InvoiceActivityType.SentInvoiceLetter: {
			return (
				<>
					<span className="font-medium text-gray-900">{user}</span> triggered
					the invoice to be sent as a letter to the client.
				</>
			);
		}

		case InvoiceActivityType.SentOfferEmail: {
			return (
				<>
					<span className="font-medium text-gray-900">{user}</span> triggered
					the offer to be sent via email to the client.
				</>
			);
		}

		case InvoiceActivityType.SentOfferLetter: {
			return (
				<>
					<span className="font-medium text-gray-900">{user}</span> triggered
					the offer to be sent as a letter to the client.
				</>
			);
		}

		case InvoiceActivityType.SentInvoiceManually: {
			return (
				<>
					<span className="font-medium text-gray-900">{user}</span> marked the
					invoice to be sent manually to the client.
				</>
			);
		}

		case InvoiceActivityType.SentOfferManually: {
			return (
				<>
					<span className="font-medium text-gray-900">{user}</span> marked the
					offer to be sent manually to the client.
				</>
			);
		}

		case InvoiceActivityType.EmailSent: {
			return <>The email was successfully sent to the client.</>;
		}

		case InvoiceActivityType.EmailDelivered: {
			return <>The email was successfully delivered to the client.</>;
		}

		case InvoiceActivityType.EmailBounced: {
			return <>The email bounced and could not be delivered.</>;
		}

		case InvoiceActivityType.CancelInvoice:
		case InvoiceActivityType.CancelOffer: {
			return (
				<>
					<span className="font-medium text-gray-900">{user}</span> cancelled
					the invoice.
				</>
			);
		}

		case InvoiceActivityType.ArchiveInvoice:
		case InvoiceActivityType.ArchiveOffer: {
			return (
				<>
					<span className="font-medium text-gray-900">{user}</span> archived the
					invoice.
				</>
			);
		}

		case InvoiceActivityType.Payment: {
			return (
				<>
					<span className="font-medium text-gray-900">{user}</span> added a
					payment of {notes} to the invoice.
				</>
			);
		}

		case InvoiceActivityType.Paid: {
			return (
				<>
					<span className="font-medium text-gray-900">{user}</span> marked the
					invoice as fully paid.
				</>
			);
		}

		case InvoiceActivityType.Updated: {
			return (
				<>
					<span className="font-medium text-gray-900">{user}</span> updated the
					invoice.
				</>
			);
		}
	}
};

function InvoiceActivityForm({
	invoiceId,
	reload,
}: {
	invoiceId: string;
	reload: () => void;
}) {
	const [comment, setComment] = React.useState('');
	const [attachment, setAttachment] =
		React.useState<AttachmentFilePartial | null>(null);
	const [attachToEmail, setAttachToEmail] = React.useState(false);
	const [uploading, setUploading] = React.useState(false);
	const fileInputRef = React.useRef<HTMLInputElement>(null);
	const ref = useAutoSizeTextArea(comment || 'Add your comment...');

	/**
	 * Handles file selection and upload (copied from AttachmentDropzoneUpload logic).
	 */
	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) {
			return;
		}
		const file = files[0];
		if (file.size > 10 * 1024 * 1024) {
			doToast({ message: 'File too large. Max size is 10MB.', type: 'danger' });
			return;
		}
		if (
			!['image/png', 'image/jpeg', 'image/gif', 'application/pdf'].includes(
				file.type,
			)
		) {
			doToast({ message: 'File type not allowed.', type: 'danger' });
			return;
		}
		setUploading(true);
		doToast({ message: 'Uploading file...' });
		try {
			// 1. Request upload URL
			const uploadResultRaw = await API.query({
				query: gql(`
					mutation RequestInvoiceActivityAttachmentUpload($fileName: String!, $mimeType: String!, $size: Int!) {
						requestUpload(fileName: $fileName, mimeType: $mimeType, size: $size) {
							uploadUrl
							attachmentId
						}
					}
				`),
				variables: {
					fileName: file.name,
					mimeType: file.type,
					size: file.size,
				},
			});
			const { requestUpload } = uploadResultRaw as RequestUploadResult;
			// 2. Upload file to S3
			await fetch(requestUpload.uploadUrl, {
				method: 'PUT',
				body: file,
				headers: { 'Content-Type': file.type },
			});
			// 3. Confirm upload
			const confirmResultRaw = await API.query({
				query: gql(`
					mutation ConfirmInvoiceActivityAttachmentUpload($attachmentId: String!) {
						confirmUpload(attachmentId: $attachmentId) {
							id
							fileName
							mimeType
							size
							createdAt
						}
					}
				`),
				variables: { attachmentId: requestUpload.attachmentId },
			});
			const { confirmUpload } = confirmResultRaw as ConfirmUploadResult;
			setAttachment(confirmUpload);
			doToast({ message: 'File uploaded', type: 'success' });
		} catch {
			doToast({ message: 'Upload failed', type: 'danger' });
		} finally {
			setUploading(false);
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
		}
	};

	/**
	 * Handles form submission for comment and/or attachment.
	 */
	const submit = async () => {
		doToast({
			promise: (async () => {
				if (attachment) {
					// Create ATTACHMENT activity
					await API.query({
						query: gql(`
							mutation AddInvoiceActivityAttachment($invoiceId: String!, $attachmentId: String!) {
								invoiceAddComment(invoiceId: $invoiceId, attachmentId: $attachmentId) {
									id
								}
							}
						`),
						variables: {
							invoiceId,
							attachmentId: attachment.id,
							notes: comment || undefined,
							attachToEmail,
						},
					});
				} else if (comment) {
					// Create NOTE activity
					await API.query({
						query: gql(`
							mutation AddInvoiceActivityNote($invoiceId: String!, $comment: String!) {
								invoiceAddComment(invoiceId: $invoiceId, comment: $comment) {
									id
								}
							}
						`),
						variables: {
							invoiceId,
							comment,
						},
					});
				}
				reload();
				setComment('');
				setAttachment(null);
				setAttachToEmail(false);
			})(),
			success: 'Activity added',
			error: 'Failed to add activity',
			loading: 'Adding activity...',
		});
	};

	return (
		<div className="mt-6 flex gap-x-3">
			<UserCircleIcon className="h-6 w-6 flex-none rounded-full bg-gray-50 text-gray-300" />
			<form action="#" className="relative flex-auto">
				<div className="overflow-hidden rounded-lg pb-12 shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-blue-600">
					<label htmlFor="comment" className="sr-only">
						Add your comment
					</label>
					<textarea
						ref={ref}
						style={{ minHeight: '5rem' }}
						rows={2}
						name="comment"
						id="comment"
						className="outline outline-transparent block w-full resize-none border-0 bg-transparent mx-2 py-1.5 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
						placeholder="Add your comment..."
						value={comment}
						onChange={(e) => setComment(e.target.value)}
						defaultValue={''}
					/>
					{/* Pending attachment preview */}
					{attachment && (
						<div className="flex items-center mt-2 gap-2">
							<span className="text-xs text-gray-700">
								{attachment.fileName}
							</span>
							<button
								type="button"
								className="text-red-500 text-xs"
								onClick={() => setAttachment(null)}
							>
								Remove
							</button>
							<label className="ml-2 flex items-center text-xs text-gray-600 cursor-pointer">
								<input
									type="checkbox"
									checked={attachToEmail}
									onChange={(e) => setAttachToEmail(e.target.checked)}
									className="mr-1"
								/>
								Attach to email
							</label>
						</div>
					)}
				</div>
				<div className="absolute border-t border-t-gray-200 bg-gray-100/20 inset-x-0 bottom-0 left-0.5 right-0.5 flex justify-between py-2 pl-3 pr-2">
					<div className="flex items-center space-x-5">
						<div className="flex items-center">
							<button
								type="button"
								className="-m-2.5 flex h-10 w-10 items-center justify-center rounded-full text-gray-400 hover:text-gray-500"
								disabled={uploading}
								onClick={() => fileInputRef.current?.click()}
							>
								<PaperClipIcon className="h-5 w-5" aria-hidden="true" />
								<span className="sr-only">Attach a file</span>
							</button>
							<input
								type="file"
								ref={fileInputRef}
								className="hidden"
								accept="image/png,image/jpeg,image/gif,application/pdf"
								onChange={handleFileChange}
								disabled={uploading}
							/>
						</div>
					</div>
					<Button
						secondary={!comment && !attachment}
						primary={!!comment || !!attachment}
						onClick={submit}
						disabled={uploading}
					>
						{attachment ? 'Add Attachment' : 'Comment'}
					</Button>
				</div>
			</form>
		</div>
	);
}

export function InvoiceActivityFeed() {
	const params = useParams();
	const { data, reload } = useInvoiceActivity();
	if (!data) {
		return null;
	}
	return (
		<>
			<h2 className="text-sm font-semibold leading-6 text-gray-900">
				Activity
			</h2>
			<ul role="list" className="mt-6 space-y-6">
				{data?.map(
					(activity, index) =>
						activity && (
							<li key={activity.id} className="relative flex gap-x-4">
								<div
									className={clsx(
										index === data.length - 1 ? 'h-6' : '-bottom-6',
										'absolute left-0 top-0 flex w-6 justify-center',
									)}
								>
									<div className="w-px bg-gray-200" />
								</div>
								{activity.type === InvoiceActivityType.Note ? (
									<>
										<UserCircleIcon className="relative mt-3 h-6 w-6 flex-none bg-gray-50" />
										<div className="flex-auto rounded-md p-2 -m-2 my-1.5 ring-1 ring-inset ring-gray-200">
											<div className="flex justify-between gap-x-4">
												<div className="py-0.5 text-xs leading-5 text-gray-500">
													<span className="font-medium text-gray-900">
														{activity.user}
													</span>{' '}
													commented
												</div>
												<time
													dateTime={activity.activityAt}
													className="flex-none py-0.5 text-xs leading-5 text-gray-500"
												>
													{dayjs(activity.activityAt).fromNow()}
												</time>
											</div>
											<p className="text-sm leading-6 text-gray-500">
												{activity.notes}
											</p>
										</div>
									</>
								) : (
									<>
										<div className="relative flex h-6 w-6 flex-none items-center justify-center bg-white">
											{getActivityIcon(activity.type)}
										</div>
										<p className="flex-auto py-0.5 text-xs leading-5 text-gray-500">
											{getActivityText(
												activity.type,
												activity.user,
												activity.notes,
											)}
										</p>
										<time
											dateTime={activity.activityAt}
											className="flex-none py-0.5 text-xs leading-5 text-gray-500"
										>
											{dayjs(activity.activityAt).fromNow()}
										</time>
									</>
								)}
							</li>
						),
				)}
			</ul>
			{params.invoiceId && typeof params.invoiceId === 'string' && (
				<InvoiceActivityForm reload={reload} invoiceId={params.invoiceId} />
			)}
		</>
	);
}

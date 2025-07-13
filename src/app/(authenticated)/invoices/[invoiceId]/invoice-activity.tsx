import clsx from 'clsx';
import React from 'react';
import { useParams } from 'next/navigation';

import {
	CheckCircleIcon,
	ClockIcon,
	EnvelopeIcon,
	PaperClipIcon,
	PlusCircleIcon,
	UserCircleIcon,
} from '@heroicons/react/20/solid';
import { TrashIcon } from '@heroicons/react/24/outline';
import relativeTime from 'dayjs/plugin/relativeTime';
import dayjs from 'dayjs';

import { downloadAttachment } from '@/api/download-attachment';

import { InvoiceActivityForm } from './invoice-activity-form';
import { useInvoiceActivity } from './data';

import { InvoiceActivityType } from '@/common/gql/graphql';
dayjs.extend(relativeTime);

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
		case InvoiceActivityType.ScheduledSend: {
			return <ClockIcon className="h-4 w-4 text-blue-600" aria-hidden="true" />;
		}
		case InvoiceActivityType.CancelledScheduledSend: {
			return <ClockIcon className="h-4 w-4 text-gray-300" aria-hidden="true" />;
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
		case InvoiceActivityType.Attachment: {
			return (
				<PaperClipIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
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
	attachment: NonNullable<
		ReturnType<typeof useInvoiceActivity>['data']
	>[number]['attachment'],
	actions?: {
		cancelScheduledSend: () => void;
	},
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

		case InvoiceActivityType.ScheduledSend: {
			return (
				<>
					{notes}
					<span
						className="text-blue-500 font-semibold cursor-pointer mx-1"
						onClick={actions?.cancelScheduledSend}
					>
						Cancel Sending
					</span>
				</>
			);
		}

		case InvoiceActivityType.CancelledScheduledSend: {
			return (
				<>
					<span style={{ textDecoration: 'line-through' }}>{notes}</span> The
					scheduled send was cancelled.
				</>
			);
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
		case InvoiceActivityType.Attachment: {
			return (
				<>
					<span className="font-medium text-gray-900">{user}</span> added{' '}
					{attachment?.fileName}
				</>
			);
		}
	}
};

/**
 * InvoiceActivityFeed displays the activity timeline for an invoice, including attachments.
 * For attachment activities, allows toggling email attachment and deleting the activity.
 */
export function InvoiceActivityFeed() {
	const params = useParams();
	const {
		data,
		reload,
		toggleAttachToEmail,
		deleteAttachmentActivity,
		cancelScheduledSend,
	} = useInvoiceActivity();

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
								) : activity.type === InvoiceActivityType.Attachment ? (
									<>
										<div className="relative flex h-6 w-6 flex-none items-center justify-center bg-white">
											{getActivityIcon(activity.type)}
										</div>
										<div className="flex-auto">
											<p
												className="py-0.5 text-xs leading-5 text-gray-500"
												onClick={() => {
													if (activity.attachment) {
														downloadAttachment(activity.attachment);
													}
												}}
												style={{ cursor: 'pointer' }}
											>
												{getActivityText(
													activity.type,
													activity.user,
													activity.notes,
													activity.attachment,
												)}
											</p>
											<div className="flex items-center gap-2 mt-1">
												{/* Toggle for attachToEmail */}
												<label className="flex items-center gap-2 text-xs">
													<input
														type="checkbox"
														checked={activity.attachToEmail || false}
														onChange={async () => {
															await toggleAttachToEmail({
																invoiceId: params.invoiceId as string,
																activityId: activity.id,
																attachToEmail: !activity.attachToEmail,
															});
														}}
													/>
													<span className="text-xs text-gray-500">
														Attach to emails
													</span>
												</label>
											</div>
										</div>
										<div className="flex-none flex-col justify-end items-end py-0.5 text-xs leading-5 text-gray-500 text-right">
											<time
												dateTime={activity.activityAt}
												className="w-full inline-block text-right"
											>
												{dayjs(activity.activityAt).fromNow()}
											</time>
											<span
												className="flex flex-row items-center gap-1 cursor-pointer hover:text-red-600 justify-end text-right"
												onClick={async () => {
													await deleteAttachmentActivity({
														invoiceId: params.invoiceId as string,
														activityId: activity.id,
													});
												}}
												aria-label="Delete attachment"
											>
												<TrashIcon className="h-3 w-3 text-red-600" />
												<span>Remove</span>
											</span>
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
												activity.attachment,
												{
													cancelScheduledSend,
												},
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

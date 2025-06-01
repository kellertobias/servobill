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

import { useInvoiceActivity } from './data';
import { InvoiceActivityForm } from './invoice-activity-form';

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
												activity.attachment,
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

import dayjs from 'dayjs';

import { InvoiceData } from '../(authenticated)/invoices/[invoiceId]/data';

import { InvoiceStatus, InvoiceType } from '@/common/gql/graphql';

export const InvoiceStatusBadgePaid = () => (
	<span className="rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-600 ring-1 ring-inset ring-green-600/20">
		Paid
	</span>
);

export const InvoiceStatusBadgePaidOverdue = () => (
	<span className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600 ring-1 ring-inset ring-red-600/20">
		Overdue
	</span>
);

export const InvoiceStatusBadgePaidPartially = () => (
	<span className="rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-600 ring-1 ring-inset ring-purple-600/20">
		Partially Paid
	</span>
);

export const InvoiceStatusBadgeSent = () => (
	<span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 ring-1 ring-inset ring-blue-600/20">
		Sent
	</span>
);

export const InvoiceStatusBadgeOffer = () => (
	<span className="rounded-md bg-transparent px-2 py-1 text-xs font-medium text-black ring-1 ring-inset ring-blue-500">
		Offer
	</span>
);

export const InvoiceStatusBadgeOfferCancelled = () => (
	<span className="rounded-md bg-transparent px-2 py-1 text-xs font-medium text-black ring-1 ring-inset ring-red-500">
		Cancelled Offer
	</span>
);

export const InvoiceStatusBadgeDraft = ({ isOffer }: { isOffer?: boolean }) => (
	<span className="rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-600 ring-1 ring-inset ring-yellow-600/20">
		Draft{isOffer ? ' Offer' : ' Invoice'}
	</span>
);

export const getInvoiceStatusBadge = (
	invoice: Pick<
		InvoiceData,
		'status' | 'type' | 'paidCents' | 'totalCents' | 'dueAt'
	>,
) => {
	switch (invoice.status) {
		case InvoiceStatus.Paid: {
			return <InvoiceStatusBadgePaid />;
		}
		case InvoiceStatus.PaidPartially: {
			return <InvoiceStatusBadgePaidPartially />;
		}
		case InvoiceStatus.Draft: {
			return (
				<InvoiceStatusBadgeDraft isOffer={invoice.type === InvoiceType.Offer} />
			);
		}
		case InvoiceStatus.Sent: {
			if (invoice.type === InvoiceType.Offer) {
				return <InvoiceStatusBadgeOffer />;
			}
			if (invoice.dueAt && dayjs(invoice.dueAt).isBefore()) {
				return <InvoiceStatusBadgePaidOverdue />;
			}
			return <InvoiceStatusBadgeSent />;
		}
		case InvoiceStatus.Cancelled: {
			return (
				<span className="rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-600/20">
					Cancelled
				</span>
			);
		}
	}
};

import { useModal } from 'react-modal-hook';

import dayjs from 'dayjs';

import { InvoiceData } from './data';
import {
	InlineEditableArea,
	InlineEditableDate,
	InlineEditableText,
} from './helpers';
import { SelectCustomerModal } from './customer-modal';

import { InvoiceType } from '@/common/gql/graphql';

export function InvoiceHeader({
	data,
	locked,
	onChange,
}: {
	data: InvoiceData;
	onChange: (data: Partial<InvoiceData>) => void;
	locked: boolean;
}) {
	const [showCustomerModal, hideCustomerModal] = useModal(() => (
		<SelectCustomerModal
			onClose={hideCustomerModal}
			onSelect={(customerId, customer) => onChange({ customer })}
		/>
	));
	return (
		<>
			{(!locked || data.subject) && (
				<p className="text-sm">
					<InlineEditableText
						prefix="Invoice Subject: "
						locked={locked}
						value={data.subject}
						placeholder="Invoice Subject"
						onChange={(subject) => onChange({ subject })}
					/>
				</p>
			)}
			<dl className="mt-6 grid grid-cols-1 text-sm leading-6 sm:grid-cols-2">
				<div className="mt-8 sm:mt-6 sm:border-t sm:border-gray-900/5 sm:pt-6">
					<InlineEditableArea
						locked={locked}
						onStartEditing={() => showCustomerModal()}
					>
						{() => (
							<>
								<dt className="font-semibold text-gray-900">To </dt>
								<dd className="mt-2 text-gray-500">
									<span className="font-medium text-gray-900">
										{data.customer?.name}
									</span>
									{data.customer?.showContact && (
										<>
											<br />
											{data.customer?.contactName}
										</>
									)}
									<br />
									{data.customer?.street}
									<br />
									{data.customer.countryCode}-{data.customer?.zip}{' '}
									{data.customer?.city}, {data.customer?.state}
								</dd>
							</>
						)}
					</InlineEditableArea>
				</div>

				<div className="mt-8 sm:mt-6 sm:border-t sm:border-gray-900/5 sm:pt-6">
					<dt className="font-semibold text-gray-900">Details</dt>
					<dd className="mt-2 text-gray-500 grid grid-cols-[100px_auto] gap-x-2 gap-y-0">
						<>
							<span>Created On</span>
							<span>
								{data.createdAt
									? dayjs(data.createdAt).format('DD.MM.YYYY, HH:mm')
									: 'Not saved yet'}
							</span>
						</>

						{(data.offeredAt || data.type === InvoiceType.Offer) && (
							<>
								<span>Offered On</span>
								<InlineEditableDate
									locked={locked}
									value={data.offeredAt}
									empty="No Offer Date"
									placeholder="Enter Date"
									onChange={(offeredAt) => onChange({ offeredAt })}
								/>
							</>
						)}

						<>
							<span>Invoiced On</span>
							<InlineEditableDate
								locked={locked}
								value={data.invoicedAt}
								empty="No Invoice Date"
								placeholder="Enter Date"
								onChange={(invoicedAt) => onChange({ invoicedAt })}
							/>
						</>
						<>
							<span>Due On</span>
							<InlineEditableDate
								locked={locked}
								value={data.dueAt}
								empty="No Due Date"
								placeholder="Enter Date"
								onChange={(dueAt) => onChange({ dueAt })}
							/>
						</>

						{data.offerNumber && (
							<>
								<span>Offer # </span>
								{data.offerNumber}
								<br />
							</>
						)}
						{data.invoiceNumber && (
							<>
								<span>Invoice # </span>
								{data.invoiceNumber}
								<br />
							</>
						)}
					</dd>
				</div>
			</dl>
		</>
	);
}

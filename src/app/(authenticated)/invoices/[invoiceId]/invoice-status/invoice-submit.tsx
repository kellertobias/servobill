import { useEffect, useState } from 'react';

import dayjs from 'dayjs';

import { DateInput } from '@/components/date';
import { confirmDialog } from '@/components/dialog';
import { doToast } from '@/components/toast';
import { API, gql } from '@/api/index';
import { Input } from '@/components/input';

import { InvoiceData } from '../data';

import { InvoiceSubmissionType } from '@/common/gql/graphql';

function InvoiceTimeSelector({
	onChange,
	initialValue,
}: {
	initialValue: Date;
	onChange: (value: Date) => void;
}) {
	const [date, setDate] = useState(initialValue);
	const [time, setTime] = useState(dayjs(initialValue).format('HH:mm'));
	const [isPast, setIsPast] = useState(false);
	useEffect(() => {
		const datetime = dayjs(date)
			.set('hour', Number.parseInt(time.split(':')[0]))
			.set('minute', Number.parseInt(time.split(':')[1]))
			.toDate();
		onChange(datetime);

		setIsPast(datetime < new Date());
	}, [date, time]);
	return (
		<>
			<div className="opacity-25">
				<div className="flex flex-row gap-2">
					<DateInput
						label="Send Date"
						value={date}
						onChange={(value) => {
							setDate(dayjs(value).toDate());
						}}
						placeholder="DD.MM.YYYY"
					/>
					<Input
						label="Time"
						value={time}
						onChange={(value) => {
							setTime(value);
						}}
						placeholder="HH:mm"
					/>
				</div>
				{isPast && (
					<p className="mt-3">
						<strong>This date is in the past:</strong>
						<br /> This will send the invoice immediately.
					</p>
				)}
			</div>
			<p className="mt-3 text-xs flex flex-row">
				<strong className="text-red-500 text-xl">! </strong>
				<span className="block italic ml-2">
					We do not yet support sending invoices on a schedule.
					<br /> Clicking submit will send the invoice immediately.
				</span>
			</p>
		</>
	);
}

export const onClickSendInvoice = async (props: {
	submitType: InvoiceSubmissionType;
	data: InvoiceData;
	reload: () => void;
	resend?: boolean;
	isOffer?: boolean;
}) => {
	const sendAt = {
		current: props.data.invoicedAt
			? dayjs(props.data.invoicedAt).set('hour', 8).set('minute', 0).toDate()
			: new Date(),
	};
	const name = props.isOffer ? 'Offer' : 'Invoice';
	if (
		await confirmDialog({
			primary: true,
			title:
				props.submitType === InvoiceSubmissionType.Manual
					? `Mark ${name} as sent?`
					: props.resend
						? `Resend ${name} to Customer?`
						: `Send ${name} to Customer?`,
			content:
				props.submitType === InvoiceSubmissionType.Manual ? (
					<>
						This will not send the {name} to the customer, but marks the
						{name} as sent. Once the {name} is marked as sent, you cannot change
						its contents. This action cannot be undone.
					</>
				) : props.resend ? (
					<>This will resend the {name} to the customer instantly.</>
				) : (
					<>
						<p className="mb-3">
							This will send the {name} to the customer and mark it as sent.
							This action cannot be undone.
						</p>
						{!props.isOffer && (
							<InvoiceTimeSelector
								initialValue={sendAt.current}
								onChange={(value) => {
									sendAt.current = value;
								}}
							/>
						)}
					</>
				),
		})
	) {
		doToast({
			promise: (async () => {
				await API.query({
					query: gql(`
                        mutation InvoiceSend(
                            $id: String!,
                            $submission: InvoiceSubmissionInput!,
                        ) {
                            invoiceSend(
                                id: $id,
                                submission: $submission,
                            ) {id}
                        }
                    `),
					variables: {
						id: props.data.id,
						submission: {
							sendType: props.submitType,
							when: props.isOffer
								? new Date().toISOString()
								: sendAt.current.toISOString(),
						},
					},
				});
				props.reload();
			})(),
			loading:
				props.submitType === InvoiceSubmissionType.Manual
					? `Marking ${name} as sent...`
					: `Sending ${name}...`,
			success:
				props.submitType === InvoiceSubmissionType.Manual
					? `${name} marked as sent!`
					: `${name} sent!`,
			error: `Failed to send ${name}.`,
		});
	}
};

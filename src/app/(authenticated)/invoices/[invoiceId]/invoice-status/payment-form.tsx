import { useEffect, useState } from 'react';

import dayjs from 'dayjs';

import { API, gql } from '@/api/index';
import { confirmDialog } from '@/components/dialog';
import { doToast } from '@/components/toast';
import { Input } from '@/components/input';
import { DateInput } from '@/components/date';

import { InvoiceData } from '../data';
type InvoicePayment = {
	cents: number;
	via: string;
	when: string;
};
function InvoicePaymentForm({
	onChange,
	initialValue,
}: {
	initialValue: InvoicePayment;
	onChange: (value: InvoicePayment) => void;
}) {
	const [state, setState] = useState({
		cents: API.centsToPrice(initialValue.cents),
		via: 'Bank Transfer',
		when: new Date(),
	});
	useEffect(() => {
		onChange({
			cents: API.priceToCents(state.cents),
			via: state.via,
			when: state.when.toISOString(),
		});
	}, [state]);
	return (
		<div className="flex flex-col gap-3">
			<Input
				label="Enter Payment Amount in Euro"
				value={state.cents}
				onChange={(cents) => {
					setState((lastState) => ({ ...lastState, cents }));
				}}
				placeholder="XXX.XX"
			/>
			<Input
				label="Payment Via"
				value={state.via}
				onChange={(via) => {
					setState((lastState) => ({ ...lastState, via }));
				}}
				placeholder="Cash/ Bank Transfer, etc."
			/>
			<DateInput
				label="Payment Date"
				value={state.when}
				onChange={(when) => {
					setState((lastState) => ({
						...lastState,
						when: dayjs(when).toDate(),
					}));
				}}
			/>
		</div>
	);
}

export const onClickEnterPayment = async (props: {
	data: InvoiceData;
	reload: () => void;
}) => {
	const payment = {
		current: {
			cents: props.data.totalCents - (props.data.paidCents || 0),
			via: 'Bank Transfer',
			when: new Date().toISOString(),
		},
	};
	if (
		await confirmDialog({
			primary: true,
			title: 'Send Invoice to Customer?',
			content: (
				<>
					<p className="mb-3">
						This will send the invoice to the customer and mark it as sent. This
						action cannot be undone.
					</p>
					<InvoicePaymentForm
						initialValue={payment.current}
						onChange={(value) => {
							payment.current = value;
						}}
					/>
				</>
			),
		})
	) {
		doToast({
			promise: (async () => {
				await API.query({
					query: gql(`
                        mutation InvoiceAddPayment(
                            $id: String!,
                            $payment: InvoicePaymentInput!,
                        ) {
                            invoiceAddPayment(
                                id: $id,
                                payment: $payment
                            ) {id}
                        }
                    `),
					variables: {
						id: props.data.id,
						payment: payment.current,
					},
				});
				props.reload();
			})(),
			loading: 'Adding Payment...',
			success: 'Payment Added!',
			error: 'Failed to add payment.',
		});
	}
};

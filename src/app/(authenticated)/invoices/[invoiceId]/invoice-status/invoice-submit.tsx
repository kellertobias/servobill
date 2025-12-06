import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { API, gql } from '@/api/index';
import { InvoiceSubmissionType } from '@/common/gql/graphql';
import { DateInput } from '@/components/date';
import { confirmDialog } from '@/components/dialog';
import { Input } from '@/components/input';
import { doToast } from '@/components/toast';
import type { InvoiceData } from '../data';

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

    const now = dayjs().add(5, 'minutes').unix();
    setIsPast(datetime.getTime() / 1000 < now);
  }, [date, time]);
  return (
    <>
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
        <p className="mt-3 text-xs">
          <b>This date is in the past:</b>
          <br />
          At the time we will try to send the invoice. This will send the invoice immediately.
          Choose a time in at least 30 minutes from now.
          <br />
          We check every 5-30 minutes for scheduled invoices and send them.
        </p>
      )}
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
            {name} as sent. Once the {name} is marked as sent, you cannot change its contents. This
            action cannot be undone.
          </>
        ) : props.resend ? (
          <>This will resend the {name} to the customer instantly.</>
        ) : (
          <>
            <p className="mb-3">
              This will send the {name} to the customer and mark it as sent. This action cannot be
              undone.
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
              when: props.isOffer ? new Date().toISOString() : sendAt.current.toISOString(),
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

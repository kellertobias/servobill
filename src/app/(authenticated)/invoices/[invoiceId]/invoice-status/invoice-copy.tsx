import type { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { API, gql } from '@/api/index';
import { InvoiceType } from '@/common/gql/graphql';
import { confirmDialog } from '@/components/dialog';
import { doToast } from '@/components/toast';
import { Toggle } from '@/components/toggle';
import type { InvoiceData } from '../data';

function InvoiceCopyForm({ onChange }: { onChange: (value: InvoiceType) => void }) {
  const [type, setType] = useState(InvoiceType.Invoice);
  useEffect(() => {
    onChange(type);
  }, [type]);
  return (
    <>
      <div className="flex flex-row gap-2">
        <Toggle
          value={type === InvoiceType.Invoice}
          onChange={(value) => {
            if (value) {
              setType(InvoiceType.Invoice);
            } else {
              setType(InvoiceType.Offer);
            }
          }}
        />
        <div className="mt-1 ml-3 leading-10">
          {type === InvoiceType.Invoice ? <strong>Invoice</strong> : <strong>Offer</strong>}
        </div>
      </div>
    </>
  );
}

export const onClickInvoiceCopy = async (props: {
  data: InvoiceData;
  isOffer?: boolean;
  router: ReturnType<typeof useRouter>;
}) => {
  const copyAs = {
    current: InvoiceType.Invoice,
  };
  if (
    await confirmDialog({
      primary: true,
      title: props.isOffer ? 'Copy Offer or generate Invoice?' : 'Copy Invoice?',
      content: (
        <>
          <p className="mb-3">
            This will generate a new invoice or offer with the same contents as this{' '}
            {props.isOffer ? 'offer' : 'invoice'}.
            {props.isOffer ? (
              <>
                This will not affect the original offer except for adding a link to the new invoice.
              </>
            ) : (
              <>This will not affect the original invoice.</>
            )}
          </p>
          <p className="mb-0">
            <strong>Copy as:</strong>
          </p>
          <InvoiceCopyForm
            onChange={(value) => {
              copyAs.current = value;
            }}
          />
        </>
      ),
    })
  ) {
    doToast({
      promise: (async () => {
        const id = await API.query({
          query: gql(`
						mutation CopyInvoice($id: String!, $as: InvoiceType!) {
							copyInvoice(id: $id, as: $as) {id}
						}
					`),
          variables: {
            id: props.data.id,
            as: copyAs.current,
          },
        }).then((res) => res.copyInvoice.id);

        // Navigate to the new invoice
        props.router.push(`/invoices/${id}`);
      })(),
      loading: props.isOffer ? 'Copying offer...' : 'Copying invoice...',
      success: props.isOffer ? 'Offer copied.' : 'Invoice copied.',
      error: props.isOffer ? 'Failed to copy offer.' : 'Failed to copy invoice.',
    });
  }
};

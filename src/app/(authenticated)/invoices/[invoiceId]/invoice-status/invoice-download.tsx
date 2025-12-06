import { API, gql } from '@/api/index';
import { backoff } from '@/common/exponential-backoff';
import { InvoiceType } from '@/common/gql/graphql';
import { doToast } from '@/components/toast';
import type { InvoiceData } from '../data';

const requestLink = async (id: string): Promise<string | null> => {
  return API.query({
    query: gql(`
			mutation RequestPdfLink($id: String!) {
				invoicePdf(id: $id)
			}
		`),
    variables: {
      id,
    },
  }).then((res) => res.invoicePdf || null);
};

export const onClickDownloadInvoice = async (props: { data: InvoiceData }) => {
  doToast({
    promise: (async () => {
      const url = await backoff(
        async () => {
          return requestLink(props.data.id);
        },
        {
          delay: 5000,
          backoffFactor: 2.5,
        }
      );

      // Fetch File
      const file = await fetch(url);

      // Convert to Blob
      const blob = await file.blob();

      // Create URL
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.target = '_blank';
      a.download = `${
        (props.data.type === InvoiceType.Invoice
          ? props.data.invoiceNumber
          : props.data.offerNumber) || `${props.data.type}-${props.data.id}`
      }.pdf`;
      document.body.append(a);
      a.click();
      document.body.removeChild(a);
    })(),
    loading: 'Generating PDF...',
    success: 'PDF Generation Done!',
    error: 'Failed to generate your PDF.',
  });
};

import { gql, query } from './graphql';

/**
 * Partial type for uploaded file (copied from AttachmentDropzone).
 */
export type AttachmentFilePartial = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
};

// GraphQL query for getting the download URL for an attachment
const ATTACHMENT_DOWNLOAD_URL_QUERY = gql(/* GraphQL */ `
	query AttachmentDownloadUrl($attachmentId: String!) {
		attachment(attachmentId: $attachmentId) {
			downloadUrl
		}
	}
`);

export const downloadAttachment = async (file: AttachmentFilePartial) => {
  // Request the download URL from the API
  const res = await query({
    query: ATTACHMENT_DOWNLOAD_URL_QUERY,
    variables: { attachmentId: file.id },
  });
  const url = res.attachment.downloadUrl;
  if (!url) {
    throw new Error('No download URL received');
  }
  // Trigger the download using a temporary anchor element
  const a = document.createElement('a');
  a.href = url;
  a.download = file.fileName;
  document.body.append(a);
  a.click();
  document.body.removeChild(a);
};

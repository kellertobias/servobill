import { PaperClipIcon } from '@heroicons/react/20/solid';
import { TrashIcon } from '@heroicons/react/24/outline';
import React from 'react';

import type { AttachmentFilePartial } from '@/api/download-attachment';
import { API, gql } from '@/api/index';
import { Button } from '@/components/button';
import { doToast } from '@/components/toast';

// Helper to format file size
function formatFileSize(size: number): string {
  if (size >= 1024 * 1024) {
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
  }
  if (size >= 1024) {
    return (size / 1024).toFixed(1) + ' KB';
  }
  return size + ' B';
}

export const useFormAttachment = () => {
  const [uploading, setUploading] = React.useState(false);

  const [attachToEmail, setAttachToEmail] = React.useState(false);
  const [attachment, setAttachment] = React.useState<AttachmentFilePartial | null>(null);

  return {
    uploading,
    attachment,
    attachToEmail,
    clearAttachment: () => {
      setAttachment(null);
      setAttachToEmail(false);
      setUploading(false);
    },
    AddAttachment: () => {
      const fileInputRef = React.useRef<HTMLInputElement>(null);

      /**
       * Handles file selection and upload (copied from AttachmentDropzoneUpload logic).
       */
      const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) {
          return;
        }
        const file = files[0];
        if (file.size > 10 * 1024 * 1024) {
          doToast({
            message: 'File too large. Max size is 10MB.',
            type: 'danger',
          });
          return;
        }
        if (!['image/png', 'image/jpeg', 'image/gif', 'application/pdf'].includes(file.type)) {
          doToast({ message: 'File type not allowed.', type: 'danger' });
          return;
        }
        setUploading(true);
        doToast({ message: 'Uploading file...' });
        try {
          // 1. Request upload URL
          const { requestUpload } = await API.query({
            query: gql(`
					mutation RequestInvoiceActivityAttachmentUpload($fileName: String!, $mimeType: String!, $size: Int!) {
						requestUpload(fileName: $fileName, mimeType: $mimeType, size: $size) {
							uploadUrl
							attachmentId
						}
					}
				`),
            variables: {
              fileName: file.name,
              mimeType: file.type,
              size: file.size,
            },
          });
          // 2. Upload file to S3
          await fetch(requestUpload.uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
          });
          // 3. Confirm upload
          const { confirmUpload } = await API.query({
            query: gql(`
					mutation ConfirmInvoiceActivityAttachmentUpload($attachmentId: String!) {
						confirmUpload(attachmentId: $attachmentId) {
							id
							fileName
							mimeType
							size
							createdAt
						}
					}
				`),
            variables: { attachmentId: requestUpload.attachmentId },
          });
          setAttachment(confirmUpload);
          doToast({ message: 'File uploaded', type: 'success' });
        } catch {
          doToast({ message: 'Upload failed', type: 'danger' });
        } finally {
          setUploading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };

      if (attachment) {
        return (
          <Button
            icon={TrashIcon}
            secondary
            onClick={() => setAttachment(null)}
            className="text-red-500"
            small
          />
        );
      }

      return (
        <div className="flex items-center space-x-5">
          <div className="flex items-center">
            <button
              type="button"
              className="-m-2.5 flex h-10 w-10 items-center justify-center rounded-full text-gray-400 hover:text-gray-500"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <PaperClipIcon className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Attach a file</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/png,image/jpeg,image/gif,application/pdf"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </div>
        </div>
      );
    },
    ExistingAttachments: () => {
      if (uploading) {
        return (
          <div className="ml-2 text-xs text-gray-500 animate-pulse px-3.5 py-2.5 leading-10">
            Uploading...
          </div>
        );
      }

      if (!attachment) {
        return null;
      }

      return (
        <div className="flex items-center w-full max-w-lg m-1">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100/20 w-full">
            {/* <DocumentTextIcon className="h-5 w-5 text-gray-400 flex-shrink-0" /> */}
            <div className="flex flex-col flex-grow min-w-0">
              <span className="text-sm text-gray-900 truncate font-medium">
                {attachment.fileName}
              </span>
              <div className="flex flex-row gap-2 justify-between items-start">
                <label className="flex items-center text-xs text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={attachToEmail}
                    onChange={(e) => setAttachToEmail(e.target.checked)}
                    className="mr-2"
                  />
                  Add to emails
                </label>

                <span className="text-xs text-gray-500">{formatFileSize(attachment.size)}</span>
              </div>
            </div>

            {uploading ? (
              <span className="ml-2 text-xs text-blue-500 animate-pulse">Uploading...</span>
            ) : null}
          </div>
        </div>
      );
    },
  };
};

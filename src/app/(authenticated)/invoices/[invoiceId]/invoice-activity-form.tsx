import { UserCircleIcon } from '@heroicons/react/20/solid';
import React from 'react';
import { API, gql } from '@/api/index';
import { Button } from '@/components/button';
import { doToast } from '@/components/toast';
import { useAutoSizeTextArea } from '@/hooks/use-auto-textarea';

import { useFormAttachment } from './invoice-activity-new-upload';

export function InvoiceActivityForm({
  invoiceId,
  reload,
}: {
  invoiceId: string;
  reload: () => void;
}) {
  const [comment, setComment] = React.useState('');
  const ref = useAutoSizeTextArea(comment || 'Add your comment...');
  const {
    AddAttachment,
    ExistingAttachments,
    attachment,
    attachToEmail,
    uploading,
    clearAttachment,
  } = useFormAttachment();

  /**
   * Handles form submission for comment and/or attachment.
   */
  const submit = async () => {
    doToast({
      promise: (async () => {
        if (attachment) {
          // Create ATTACHMENT activity
          await API.query({
            query: gql(`
							mutation AddInvoiceActivityAttachment($invoiceId: String!, $attachmentId: String!, $attachToEmail: Boolean) {
								invoiceAddComment(invoiceId: $invoiceId, attachmentId: $attachmentId, attachToEmail: $attachToEmail) {
									id
								}
							}
						`),
            variables: {
              invoiceId,
              attachmentId: attachment.id,
              notes: comment || undefined,
              attachToEmail,
            },
          });
        } else if (comment) {
          // Create NOTE activity
          await API.query({
            query: gql(`
							mutation AddInvoiceActivityNote($invoiceId: String!, $comment: String!) {
								invoiceAddComment(invoiceId: $invoiceId, comment: $comment) {
									id
								}
							}
						`),
            variables: {
              invoiceId,
              comment,
            },
          });
        }
        reload();
        setComment('');
        clearAttachment();
      })(),
      success: 'Activity added',
      error: 'Failed to add activity',
      loading: 'Adding activity...',
    });
  };

  return (
    <div className="mt-6 flex gap-x-3 w-full flex-row -mr-px">
      <UserCircleIcon className="h-6 w-6 flex-none rounded-full bg-gray-50 text-gray-300" />
      <form action="#" className="relative flex-grow min-w-0">
        <div className="overflow-hidden w-full rounded-lg pb-[52px] shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-blue-600">
          {attachment || uploading ? (
            <ExistingAttachments />
          ) : (
            <>
              <label htmlFor="comment" className="sr-only">
                Add your comment
              </label>
              <textarea
                ref={ref}
                style={{ minHeight: '5rem' }}
                rows={2}
                name="comment"
                id="comment"
                className="outline outline-transparent block w-full resize-none border-0 bg-transparent py-2.5 px-3.5 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                placeholder="Add your comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                defaultValue={''}
              />
            </>
          )}
        </div>
        <div className="absolute border-t border-t-gray-200 bg-gray-100/50 inset-x-0 bottom-0 left-0.5 right-0.5 flex justify-between py-2 pl-3 pr-2">
          <div className="flex items-center space-x-5">
            {comment ? (
              <span className="text-xs text-gray-500 cursor-pointer" onClick={() => setComment('')}>
                Remove comment to add attachment
              </span>
            ) : (
              <AddAttachment />
            )}
          </div>
          <Button
            secondary={!comment && !attachment}
            primary={!!comment || !!attachment}
            onClick={submit}
            disabled={uploading}
          >
            {attachment ? 'Add Attachment' : 'Comment'}
          </Button>
        </div>
      </form>
    </div>
  );
}

import React, { useState } from 'react';

import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';

import { gql, query } from '@/api/graphql';

/**
 * Partial type for uploaded file (copied from AttachmentDropzone).
 */
export type AttachmentFilePartial = {
	id: string;
	fileName: string;
	mimeType: string;
	size: number;
	createdAt: string;
};

/**
 * Props for AttachmentFileList component.
 */
export interface AttachmentFileListProps {
	files: AttachmentFilePartial[];
	readOnly?: boolean;
	onDelete?: (id: string) => void;
}

// GraphQL mutation for deleting an attachment
const DELETE_ATTACHMENT_MUTATION = gql(/* GraphQL */ `
	mutation DeleteAttachment($attachmentId: String!) {
		deleteAttachment(attachmentId: $attachmentId)
	}
`);

/**
 * Displays a list of uploaded files, with optional delete buttons.
 * Handles file deletion internally and notifies parent via onDelete.
 */
export const AttachmentFileList: React.FC<AttachmentFileListProps> = ({
	files,
	readOnly = false,
	onDelete,
}) => {
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	/**
	 * Handles deleting a file by calling the GraphQL mutation.
	 * Notifies parent via onDelete callback if provided.
	 */
	const handleDelete = async (id: string) => {
		setDeletingId(id);
		setError(null);
		try {
			await query({
				query: DELETE_ATTACHMENT_MUTATION as TypedDocumentNode<
					unknown,
					unknown
				>,
				variables: { attachmentId: id },
			});
			if (onDelete) {
				onDelete(id);
			}
		} catch (error_: unknown) {
			const errorMsg =
				error_ instanceof Error ? error_.message : 'Delete failed';
			setError(errorMsg);
		} finally {
			setDeletingId(null);
		}
	};

	return (
		<div className="mt-4">
			{error && <div className="text-red-500 text-sm mb-2">{error}</div>}
			{files.length > 0 ? (
				<ul className="divide-y divide-gray-200">
					{files.map((file) => (
						<li
							key={file.id}
							className="flex items-center justify-between py-2"
						>
							<div className="flex items-center gap-2">
								<PhotoIcon
									className="h-6 w-6 text-gray-400"
									aria-hidden="true"
								/>
								<span className="text-sm text-gray-900">{file.fileName}</span>
								<span className="ml-2 text-xs text-gray-500">
									{(file.size / 1024).toFixed(1)} KB
								</span>
							</div>
							{!readOnly && (
								<button
									type="button"
									className="ml-2 text-gray-400 hover:text-red-500 disabled:opacity-50"
									onClick={() => handleDelete(file.id)}
									disabled={deletingId === file.id}
								>
									<XMarkIcon className="h-5 w-5" aria-hidden="true" />
								</button>
							)}
						</li>
					))}
				</ul>
			) : (
				<p className="text-sm text-gray-500">No attachments uploaded.</p>
			)}
		</div>
	);
};

import type React from 'react';
import { useState } from 'react';

import type { AttachmentFilePartial } from '@/api/download-attachment';

import { AttachmentDropzoneUpload } from './attachment-dropzone-upload';
import { AttachmentFileList } from './attachment-file-list';

/**
 * Type representing an attachment file.
 */
export interface AttachmentFile {
	id: string;
	fileName: string;
	mimeType: string;
	size: number;
	status: string;
	s3Key: string;
	s3Bucket: string;
	invoiceId?: string;
	expenseId?: string;
	inventoryId?: string;
	createdAt: string;
	updatedAt: string;
}

/**
 * Props for the AttachmentDropzone component.
 */
export interface AttachmentDropzoneProps {
	/**
	 * Attachments already uploaded (from parent, e.g. loaded from API).
	 */
	value?: AttachmentFilePartial[];
	/**
	 * Callback when attachments change (upload/delete).
	 */
	onChange?: (files: AttachmentFilePartial[]) => void;
	/**
	 * If true, disables upload and drag-and-drop.
	 */
	readOnly?: boolean;
	/**
	 * Link uploaded files to an invoice.
	 */
	invoiceId?: string;
	/**
	 * Link uploaded files to an expense.
	 */
	expenseId?: string;
	/**
	 * Link uploaded files to an inventory item.
	 */
	inventoryId?: string;
	/**
	 * Max file size in bytes (default: 10MB).
	 */
	maxSize?: number;
	/**
	 * Allowed mime types (default: images and pdf).
	 */
	accept?: string[];
}

/**
 * Combines AttachmentDropzoneUpload and AttachmentFileList into a single component.
 * Manages file state and provides the same API as before.
 *
 * If there is already at least one attachment, the dropzone is rendered in compact mode (smaller UI).
 */
export const AttachmentDropzone: React.FC<AttachmentDropzoneProps> = ({
	value = [],
	onChange,
	readOnly = false,
	invoiceId,
	expenseId,
	inventoryId,
	maxSize = 10 * 1024 * 1024,
	accept = ['image/png', 'image/jpeg', 'image/gif', 'application/pdf'],
}) => {
	// Local state for files and error
	const [files, setFiles] = useState<AttachmentFilePartial[]>(value);
	const [error, setError] = useState<string | null>(null);
	// Merge value prop and local files (avoid duplicates by id)
	const allFiles = [
		...new Map([...value, ...files].map((f) => [f.id, f])).values(),
	];

	// Handle successful upload from AttachmentDropzoneUpload
	const handleUpload = (file: AttachmentFilePartial) => {
		setFiles((prev) => {
			const next = [...prev, file];
			if (onChange) {
				onChange(next);
			}
			return next;
		});
		setError(null);
	};

	// Handle error from AttachmentDropzoneUpload
	const handleUploadError = (err: string) => {
		setError(err);
	};

	return (
		<div className="col-span-full">
			<label
				htmlFor="cover-photo"
				className="block text-sm/6 font-medium text-gray-900"
			>
				Attachments
			</label>
			{/* Uploaded files list. Deletion is handled internally in AttachmentFileList. */}
			<AttachmentFileList
				files={allFiles}
				readOnly={readOnly}
				onDelete={(id) => {
					setFiles((prev) => {
						const next = prev.filter((f) => f.id !== id);
						if (onChange) {
							onChange(next);
						}
						return next;
					});
				}}
			/>

			{/* Upload dropzone (hidden if readOnly). Compact if there are already attachments. */}
			<AttachmentDropzoneUpload
				readOnly={readOnly}
				maxSize={maxSize}
				accept={accept}
				invoiceId={invoiceId}
				expenseId={expenseId}
				inventoryId={inventoryId}
				onUpload={handleUpload}
				onError={handleUploadError}
				compact={allFiles.length > 0}
			/>
			{error && <div className="text-red-500 text-sm mt-1">{error}</div>}
		</div>
	);
};

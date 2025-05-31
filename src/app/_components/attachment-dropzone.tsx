import React, { useRef, useState } from 'react';
import clsx from 'clsx';

import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';

import { gql, query } from '@/api/graphql';

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

export type AttachmentFilePartial = Pick<
	AttachmentFile,
	'id' | 'fileName' | 'mimeType' | 'size' | 'createdAt'
>;

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

// GraphQL operations
const REQUEST_UPLOAD_MUTATION = gql(/* GraphQL */ `
	mutation RequestAttachmentUpload($input: RequestAttachmentUploadUrlInput!) {
		requestUpload(input: $input) {
			uploadUrl
			attachmentId
		}
	}
`);

const CONFIRM_UPLOAD_MUTATION = gql(/* GraphQL */ `
	mutation ConfirmAttachmentUpload($attachmentId: String!) {
		confirmUpload(attachmentId: $attachmentId) {
			id
			fileName
			mimeType
			size
			status
			s3Key
			s3Bucket
			invoiceId
			expenseId
			inventoryId
			createdAt
			updatedAt
		}
	}
`);

const DELETE_ATTACHMENT_MUTATION = gql(/* GraphQL */ `
	mutation DeleteAttachment($attachmentId: String!) {
		deleteAttachment(attachmentId: $attachmentId)
	}
`);

/**
 * AttachmentDropzone component for uploading and listing files.
 *
 * - Shows a dropzone for drag-and-drop or file picker (unless readOnly)
 * - Shows a list of uploaded files (from value prop and self-uploaded)
 * - Calls onChange when files are uploaded or deleted
 * - Links uploads to invoiceId, expenseId, or inventoryId if provided
 */
export const AttachmentDropzone: React.FC<AttachmentDropzoneProps> = ({
	value = [],
	onChange,
	readOnly = false,
	invoiceId,
	expenseId,
	inventoryId,
	maxSize = 10 * 1024 * 1024, // 10MB
	accept = ['image/png', 'image/jpeg', 'image/gif', 'application/pdf'],
}) => {
	const [uploading, setUploading] = useState(false);
	const [files, setFiles] = useState<AttachmentFilePartial[]>(value);
	const [error, setError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Handle file selection (from input or drop)
	const handleFiles = async (fileList: FileList | null) => {
		if (!fileList) {
			return;
		}
		const newFiles: File[] = [...fileList];
		for (const file of newFiles) {
			if (file.size > maxSize) {
				setError('File too large. Max size is 10MB.');
				continue;
			}
			if (!accept.includes(file.type)) {
				setError('File type not allowed.');
				continue;
			}
			setUploading(true);
			setError(null);
			try {
				// 1. Request upload URL from backend
				const uploadResultRaw = await query({
					query: REQUEST_UPLOAD_MUTATION as TypedDocumentNode<unknown, unknown>,
					variables: {
						input: {
							fileName: file.name,
							mimeType: file.type,
							size: file.size,
							invoiceId,
							expenseId,
							inventoryId,
						},
					},
				});
				const { requestUpload } = uploadResultRaw as {
					requestUpload: { uploadUrl: string; attachmentId: string };
				};
				// 2. Upload file to S3
				await fetch(requestUpload.uploadUrl, {
					method: 'PUT',
					body: file,
					headers: {
						'Content-Type': file.type,
					},
				});
				// 3. Confirm upload
				const confirmResultRaw = await query({
					query: CONFIRM_UPLOAD_MUTATION as TypedDocumentNode<unknown, unknown>,
					variables: { attachmentId: requestUpload.attachmentId },
				});
				const { confirmUpload } = confirmResultRaw as {
					confirmUpload: AttachmentFilePartial;
				};
				// 4. Add to list
				setFiles((prev) => {
					const next = [...prev, confirmUpload];
					if (onChange) {
						onChange(next);
					}
					return next;
				});
			} catch (error_: unknown) {
				const errorMsg =
					error_ instanceof Error ? error_.message : 'Upload failed';
				setError(errorMsg);
			} finally {
				setUploading(false);
			}
		}
	};

	// Handle file input change
	const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		handleFiles(e.target.files);
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	// Handle drag and drop
	const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		if (readOnly) {
			return;
		}
		handleFiles(e.dataTransfer.files);
	};

	// Remove a file (delete from backend)
	const removeFile = async (id: string) => {
		setUploading(true);
		setError(null);
		try {
			await query({
				query: DELETE_ATTACHMENT_MUTATION as TypedDocumentNode<
					unknown,
					unknown
				>,
				variables: { attachmentId: id },
			});
			setFiles((prev) => {
				const next = prev.filter((f) => f.id !== id);
				if (onChange) {
					onChange(next);
				}
				return next;
			});
		} catch (error_: unknown) {
			const errorMsg =
				error_ instanceof Error ? error_.message : 'Delete failed';
			setError(errorMsg);
		} finally {
			setUploading(false);
		}
	};

	// Merge value prop and local files (avoid duplicates by id)
	const allFiles = [
		...new Map([...value, ...files].map((f) => [f.id, f])).values(),
	];

	return (
		<div className="col-span-full">
			<label
				htmlFor="cover-photo"
				className="block text-sm/6 font-medium text-gray-900"
			>
				Attachments
			</label>
			{error && <div className="text-red-500 text-sm mt-1">{error}</div>}
			{!readOnly && (
				<div
					className={clsx(
						'mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-6',
						uploading && 'opacity-50 pointer-events-none',
					)}
					onDrop={onDrop}
					onDragOver={(e) => e.preventDefault()}
				>
					<div className="text-center">
						<PhotoIcon
							aria-hidden="true"
							className="mx-auto w-12 h-12 text-gray-300"
						/>
						<div className="mt-4 flex text-sm/6 text-gray-600">
							<label
								htmlFor="file-upload"
								className="relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
							>
								<span>Upload a file</span>
								<input
									id="file-upload"
									name="file-upload"
									type="file"
									className="sr-only"
									ref={fileInputRef}
									onChange={onFileInputChange}
									multiple
									accept={accept.join(',')}
									disabled={uploading}
								/>
							</label>
							<p className="pl-1">or drag and drop</p>
						</div>
						<p className="text-xs/5 text-gray-600">
							PNG, JPG, GIF, PDF up to 10MB
						</p>
					</div>
				</div>
			)}
			{/* Uploaded files list */}
			<div className="mt-4">
				{allFiles.length > 0 ? (
					<ul className="divide-y divide-gray-200">
						{allFiles.map((file) => (
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
										className="ml-2 text-gray-400 hover:text-red-500"
										onClick={() => removeFile(file.id)}
										disabled={uploading}
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
		</div>
	);
};

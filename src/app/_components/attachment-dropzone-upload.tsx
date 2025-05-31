import React, { useRef, useState } from 'react';
import clsx from 'clsx';

import { PhotoIcon } from '@heroicons/react/24/outline';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';

import { gql, query } from '@/api/graphql';

/**
 * Props for AttachmentDropzoneUpload component.
 */
export interface AttachmentDropzoneUploadProps {
	readOnly?: boolean;
	maxSize?: number;
	accept?: string[];
	invoiceId?: string;
	expenseId?: string;
	inventoryId?: string;
	onUpload?: (file: AttachmentFilePartial) => void;
	onError?: (error: string) => void;
}

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

// GraphQL operations for upload
const REQUEST_UPLOAD_MUTATION = gql(`
	mutation RequestAttachmentUpload($fileName: String!, $mimeType: String!, $size: Int!) {
		requestUpload(fileName: $fileName, mimeType: $mimeType, size: $size) {
			uploadUrl
			attachmentId
		}
	}
`);

const CONFIRM_UPLOAD_MUTATION = gql(`
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

/**
 * Handles file selection, drag-and-drop, and uploading files.
 * Calls onUpload when a file is successfully uploaded.
 */
export const AttachmentDropzoneUpload: React.FC<
	AttachmentDropzoneUploadProps
> = ({
	readOnly = false,
	maxSize = 10 * 1024 * 1024,
	accept = ['image/png', 'image/jpeg', 'image/gif', 'application/pdf'],
	onUpload,
	onError,
}) => {
	const [uploading, setUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Handles file selection and upload
	const handleFiles = async (fileList: FileList | null) => {
		if (!fileList) {
			return;
		}
		const newFiles: File[] = [...fileList];
		for (const file of newFiles) {
			if (file.size > maxSize) {
				onError?.('File too large. Max size is 10MB.');
				continue;
			}
			if (!accept.includes(file.type)) {
				onError?.('File type not allowed.');
				continue;
			}
			setUploading(true);
			onError?.('');
			try {
				// 1. Request upload URL from backend
				const uploadResultRaw = await query({
					query: REQUEST_UPLOAD_MUTATION,
					variables: {
						fileName: file.name,
						mimeType: file.type,
						size: file.size,
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
				// 4. Notify parent
				onUpload?.(confirmUpload);
			} catch (error_: unknown) {
				const errorMsg =
					error_ instanceof Error ? error_.message : 'Upload failed';
				onError?.(errorMsg);
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

	return readOnly ? null : (
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
				<p className="text-xs/5 text-gray-600">PNG, JPG, GIF, PDF up to 10MB</p>
			</div>
		</div>
	);
};

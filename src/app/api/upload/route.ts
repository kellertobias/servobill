import 'reflect-metadata';

import { NextRequest } from 'next/server';

import * as multipart from 'parse-multipart-data';

import { checkAuth } from '../check-auth';

import { UploadHelper, NotConfiguredError } from './upload-service';

import { DefaultContainer } from '@/common/di';

/**
 * GET /api/download?attachmentId=...
 * Handles file downloads when UPLOAD_DIRECTORY is set.
 * Serves files from the path specified by the attachment's s3Key.
 *
 * Query: attachmentId (required)
 */
export async function PUT(request: NextRequest) {
	try {
		// Validate authentication
		const auth = await checkAuth(request);
		if (!auth.isValid) {
			return new Response(
				JSON.stringify({
					error: 'Authentication required',
					details: auth.error,
				}),
				{ status: 401 },
			);
		}

		const uploadHelper = DefaultContainer.get<UploadHelper>(UploadHelper);

		const { searchParams } = new URL(request.url);
		const attachmentId = searchParams.get('attachmentId');

		if (!attachmentId) {
			return new Response(
				JSON.stringify({ error: 'Missing attachmentId parameter' }),
				{
					status: 400,
				},
			);
		}

		const contentType = request.headers.get('content-type') || '';
		let fileData: Buffer;

		// Handle multipart form data uploads
		if (contentType.startsWith('multipart/form-data')) {
			const boundary = contentType.split('boundary=')[1];
			if (!boundary) {
				return new Response(
					JSON.stringify({ error: 'No boundary in Content-Type' }),
					{ status: 400 },
				);
			}

			const buffer = Buffer.from(await request.arrayBuffer());
			const parts = multipart.parse(buffer, boundary);

			// Only allow one file per upload
			if (parts.length !== 1 || !parts[0].filename) {
				return new Response(
					JSON.stringify({ error: 'Only one file per upload is allowed.' }),
					{ status: 400 },
				);
			}

			const part = parts[0];
			if (!part.data) {
				return new Response(
					JSON.stringify({ error: 'No file data found in upload.' }),
					{ status: 400 },
				);
			}

			fileData = part.data;
		} else {
			// Handle raw file uploads - treat entire body as file data
			// The content-type should be the mime type of the file
			fileData = Buffer.from(await request.arrayBuffer());

			// Validate that we have some data
			if (fileData.length === 0) {
				return new Response(
					JSON.stringify({ error: 'No file data found in upload.' }),
					{ status: 400 },
				);
			}
		}

		await uploadHelper.uploadFile(attachmentId, fileData);

		return new Response(JSON.stringify({ success: true, attachmentId }), {
			status: 200,
		});
	} catch (error) {
		if (error instanceof NotConfiguredError) {
			return new Response(
				JSON.stringify({
					error: 'Local file storage is not enabled in this deployment',
				}),
				{
					status: 501,
				},
			);
		}
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
		});
	}
}

export async function POST() {
	return new Response(
		JSON.stringify({ error: 'Method not allowed', details: 'Use PUT instead' }),
		{
			status: 405,
		},
	);
}

export async function GET() {
	return new Response(JSON.stringify({ error: 'Method not allowed' }), {
		status: 405,
	});
}

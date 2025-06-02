import { NextRequest } from 'next/server';

import * as multipart from 'parse-multipart-data';

import { UploadHelper } from './upload-service';
import { NotConfiguredError } from './upload-service';

import { DefaultContainer } from '@/common/di';

/**
 * GET /api/download?attachmentId=...
 * Handles file downloads when UPLOAD_DIRECTORY is set.
 * Serves files from the path specified by the attachment's s3Key.
 *
 * Query: attachmentId (required)
 */
export async function POST(request: NextRequest) {
	try {
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

		// Parse multipart form data
		const contentType = request.headers.get('content-type') || '';
		if (!contentType.startsWith('multipart/form-data')) {
			return new Response(
				JSON.stringify({ error: 'Content-Type must be multipart/form-data' }),
				{ status: 400 },
			);
		}

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

		await uploadHelper.uploadFile(attachmentId, part.data);

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

export async function GET() {
	return new Response(JSON.stringify({ error: 'Method not allowed' }), {
		status: 405,
	});
}

import { NextRequest } from 'next/server';

import { DownloadHelper, NotFoundError } from './download-service';
import { NotConfiguredError } from './download-service';

import { DefaultContainer } from '@/common/di';

/**
 * GET /api/download?attachmentId=...
 * Handles file downloads when UPLOAD_DIRECTORY is set.
 * Serves files from the path specified by the attachment's s3Key.
 *
 * Query: attachmentId (required)
 */
export async function GET(request: NextRequest) {
	try {
		const downloadHelper = DefaultContainer.get<DownloadHelper>(DownloadHelper);

		const { searchParams } = new URL(request.url);
		const attachmentId = searchParams.get('attachmentId');
		const bucket = searchParams.get('bucket');
		const key = searchParams.get('key');

		const file = await (() => {
			if (attachmentId) {
				return downloadHelper.getFileByAttachmentId(attachmentId);
			}
			if (key) {
				return downloadHelper.getFileByKey(key, bucket);
			}
			return null;
		})();
		if (!file) {
			return new Response(JSON.stringify({ error: 'File not found' }), {
				status: 404,
			});
		}

		return new Response(file.file, {
			status: 200,
			headers: {
				'Content-Type': file.contentType,
				'Content-Disposition': `attachment; filename="${file.fileName}"`,
			},
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
		if (error instanceof NotFoundError) {
			return new Response(JSON.stringify({ error: 'File not found' }), {
				status: 404,
			});
		}
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
		});
	}
}

import { NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

import { DefaultContainer } from '@/common/di';
import { ATTACHMENT_REPOSITORY } from '@/backend/repositories';
import type { AttachmentRepository } from '@/backend/repositories';
import { CONFIG_SERVICE } from '@/backend/services/di-tokens';
import type { ConfigService } from '@/backend/services/config.service';

/**
 * GET /api/download?attachmentId=...
 * Handles file downloads when UPLOAD_DIRECTORY is set.
 * Serves files from the path specified by the attachment's s3Key.
 *
 * Query: attachmentId (required)
 */
export async function GET(request: NextRequest) {
	// Use ConfigService to get the upload directory
	const config = DefaultContainer.get<ConfigService>(CONFIG_SERVICE);
	const uploadDir = config.uploadDirectory;
	if (!uploadDir) {
		return new Response(JSON.stringify({ error: 'UPLOAD_DIRECTORY not set' }), {
			status: 501,
		});
	}

	const { searchParams } = new URL(request.url);
	const attachmentId = searchParams.get('attachmentId');
	if (!attachmentId) {
		return new Response(
			JSON.stringify({ error: 'Missing attachmentId parameter' }),
			{ status: 400 },
		);
	}

	// DI: Load the attachment repository
	const repository = DefaultContainer.get<AttachmentRepository>(
		ATTACHMENT_REPOSITORY,
	);
	const attachment = await repository.getById(attachmentId);
	if (!attachment) {
		return new Response(JSON.stringify({ error: 'Attachment not found' }), {
			status: 404,
		});
	}

	const filePath = path.join(uploadDir, attachment.s3Key);
	try {
		const fileBuffer = await readFile(filePath);
		// Use the mimeType from the attachment entity if available
		const contentType = attachment.mimeType || 'application/octet-stream';
		return new Response(fileBuffer, {
			status: 200,
			headers: {
				'Content-Type': contentType,
				'Content-Disposition': `attachment; filename="${attachment.fileName}"`,
			},
		});
	} catch {
		return new Response(JSON.stringify({ error: 'File not found' }), {
			status: 404,
		});
	}
}

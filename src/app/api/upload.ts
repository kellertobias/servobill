import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

import * as multipart from 'parse-multipart-data';

import { DefaultContainer } from '@/common/di';
import { ATTACHMENT_REPOSITORY } from '@/backend/repositories';
import type { AttachmentRepository } from '@/backend/repositories';
import { CONFIG_SERVICE } from '@/backend/services/di-tokens';
import type { ConfigService } from '@/backend/services/config.service';

/**
 * POST /api/upload?attachmentId=...
 * Handles file uploads when UPLOAD_DIRECTORY is set.
 * Accepts multipart/form-data and saves the file to the path specified by the attachment's s3Key.
 *
 * Query: attachmentId (required)
 *
 * Returns: { success: true, attachmentId: string }
 */
export async function POST(request: NextRequest) {
	// Use ConfigService to get the upload directory
	const config = DefaultContainer.get<ConfigService>(CONFIG_SERVICE);
	const uploadDir = config.uploadDirectory;
	if (!uploadDir) {
		return new Response(
			JSON.stringify({
				error:
					'UPLOAD_DIRECTORY not set - direct uploads are disabled in this deployment',
			}),
			{
				status: 501,
			},
		);
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
	if (attachment.status !== 'pending') {
		return new Response(
			JSON.stringify({ error: 'Attachment is not pending' }),
			{ status: 400 },
		);
	}

	// Ensure upload directory exists
	if (!existsSync(uploadDir)) {
		await mkdir(uploadDir, { recursive: true });
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

	// Use the s3Key from the attachment entity as the file path
	const filePath = path.join(uploadDir, attachment.s3Key);
	const fileData = Uint8Array.from(part.data as ArrayLike<number>);
	await writeFile(filePath, fileData);

	return new Response(JSON.stringify({ success: true, attachmentId }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
}

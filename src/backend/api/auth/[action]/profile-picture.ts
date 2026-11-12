import {
	FILE_STORAGE_SERVICE,
	type FileStorageService,
} from '@/backend/services/file-storage.service';
import { Logger } from '@/backend/services/logger.service';
import { DefaultContainer } from '@/common/di';

const logger = new Logger('ProfilePicture');

/**
 * Downloads a profile picture from an identity provider and stores it in the
 * file storage. Returns the stored file URL or null if anything fails.
 */
export const storeProfilePicture = async (
	pictureUrl: string | undefined,
	userId: string,
): Promise<string | null> => {
	if (!pictureUrl || !/^https:\/\//.test(pictureUrl)) {
		return null;
	}
	try {
		const response = await fetch(pictureUrl, {
			signal: AbortSignal.timeout(5000),
		});
		if (!response.ok) {
			return null;
		}
		const buffer = Buffer.from(await response.arrayBuffer());
		if (buffer.length > 2 * 1024 * 1024) {
			return null;
		}
		const fileStorageService =
			DefaultContainer.get<FileStorageService>(FILE_STORAGE_SERVICE);
		return await fileStorageService.saveFile(
			`profile-pictures/${userId}.png`,
			buffer,
		);
	} catch (error) {
		// Log the error and return null so login does not fail
		logger.warn('Failed to store profile picture', { error });
		return null;
	}
};

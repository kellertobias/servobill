import { decode, encode } from 'jpeg-js';
import type { UserEntity } from '@/backend/entities/user.entity';
import { Inject, Service } from '@/common/di';
import {
	FILE_STORAGE_SERVICE,
	type FileStorageService,
} from './file-storage.service';
import { Logger } from './logger.service';
import { UserDirectoryService } from './user-directory.service';

/** Profile pictures are stored as square JPEGs of this size. */
export const PROFILE_PICTURE_SIZE = 512;
/** Quality used when re-encoding the uploaded picture. */
const JPEG_QUALITY = 85;
/** A 512x512 JPEG is far below this; anything larger is rejected. */
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

/** Folder for pictures the users uploaded themselves. */
const UPLOAD_PREFIX = 'profile-pictures/uploads/';

export class ProfilePictureError extends Error {}

/**
 * Decodes an uploaded picture and encodes it again as a 512x512 JPEG.
 *
 * The browser crops and scales the picture; the server only accepts the
 * result. Encoding it again makes sure the stored file is a plain JPEG and
 * drops all metadata such as camera details or the GPS location.
 */
export const normalizeProfilePicture = (data: Buffer): Buffer => {
	if (data.length === 0 || data.length > MAX_UPLOAD_BYTES) {
		throw new ProfilePictureError('The picture is empty or too large');
	}
	// JPEG files start with the SOI marker FF D8
	if (data[0] !== 0xff || data[1] !== 0xd8) {
		throw new ProfilePictureError('The picture must be a JPEG');
	}
	let image: ReturnType<typeof decode>;
	try {
		image = decode(data, {
			formatAsRGBA: true,
			maxResolutionInMP: 1,
			maxMemoryUsageInMB: 32,
		});
	} catch {
		throw new ProfilePictureError('The picture could not be read');
	}
	if (
		image.width !== PROFILE_PICTURE_SIZE ||
		image.height !== PROFILE_PICTURE_SIZE
	) {
		throw new ProfilePictureError(
			`The picture must be ${PROFILE_PICTURE_SIZE}x${PROFILE_PICTURE_SIZE} pixels`,
		);
	}
	return encode(
		{ width: image.width, height: image.height, data: image.data },
		JPEG_QUALITY,
	).data;
};

/** Parses a data URL or plain base64 string into a buffer. */
export const decodeBase64Image = (value: string): Buffer => {
	const base64 = value.replace(/^data:image\/jpeg;base64,/, '');
	if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
		throw new ProfilePictureError('The picture is not valid base64');
	}
	return Buffer.from(base64, 'base64');
};

/**
 * Lets users upload or remove their own profile picture. Pictures from an
 * identity provider (Google, OIDC) are handled at sign in and never replace
 * an uploaded one.
 */
@Service()
export class ProfilePictureService {
	private logger = new Logger('ProfilePictureService');

	constructor(
		@Inject(FILE_STORAGE_SERVICE)
		private fileStorage: FileStorageService,
		@Inject(UserDirectoryService)
		private userDirectory: UserDirectoryService,
	) {}

	/** True when the user uploaded the picture (instead of an SSO provider). */
	public isUploaded(profilePictureUrl: string | undefined): boolean {
		if (!profilePictureUrl) {
			return false;
		}
		const key =
			this.fileStorage.getFileDescriptor(profilePictureUrl)?.key ?? '';
		// With path style S3 URLs the key starts with the bucket name
		return key.startsWith(UPLOAD_PREFIX) || key.includes(`/${UPLOAD_PREFIX}`);
	}

	public async upload(userId: string, image: string): Promise<UserEntity> {
		const user = await this.requireUser(userId);
		const jpeg = normalizeProfilePicture(decodeBase64Image(image));
		// A new key per upload, so browsers and CDNs never show a cached old one
		const key = `${UPLOAD_PREFIX}${user.id}/${Date.now()}.jpg`;
		const url = await this.fileStorage.saveFile(key, jpeg);
		const previous = user.profilePictureUrl;
		await this.userDirectory.setProfilePicture(user, url);
		await this.deleteIfUploaded(previous);
		return user;
	}

	public async remove(userId: string): Promise<UserEntity> {
		const user = await this.requireUser(userId);
		const previous = user.profilePictureUrl;
		await this.userDirectory.setProfilePicture(user, '');
		await this.deleteIfUploaded(previous);
		return user;
	}

	/** Signed or local URL the browser can load the picture from. */
	public async getDisplayUrl(
		profilePictureUrl: string | undefined,
	): Promise<string | null> {
		if (!profilePictureUrl) {
			return null;
		}
		const descriptor = this.fileStorage.getFileDescriptor(profilePictureUrl);
		return descriptor ? this.fileStorage.getDownloadUrl(descriptor) : null;
	}

	private async deleteIfUploaded(url: string | undefined): Promise<void> {
		if (!url || !this.isUploaded(url)) {
			return;
		}
		const descriptor = this.fileStorage.getFileDescriptor(url);
		if (!descriptor) {
			return;
		}
		try {
			await this.fileStorage.deleteFile(descriptor.key, {
				bucket: descriptor.bucket,
			});
		} catch (error) {
			// The new picture is saved already; a leftover file is harmless
			this.logger.warn('Failed to delete the old profile picture', { error });
		}
	}

	private async requireUser(userId: string): Promise<UserEntity> {
		const user = await this.userDirectory.getUser(userId);
		if (!user) {
			throw new ProfilePictureError('User not found');
		}
		return user;
	}
}

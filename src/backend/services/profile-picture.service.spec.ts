import { decode, encode } from 'jpeg-js';
import { describe, expect, it } from 'vitest';
import {
	decodeBase64Image,
	normalizeProfilePicture,
	PROFILE_PICTURE_SIZE,
	ProfilePictureError,
} from './profile-picture.service';

const makeJpeg = (width: number, height: number, comment?: string) =>
	encode(
		{
			width,
			height,
			data: Buffer.alloc(width * height * 4, 200),
			comments: comment ? [comment] : undefined,
		},
		90,
	).data;

describe('normalizeProfilePicture', () => {
	it('re-encodes a 512x512 JPEG and keeps the size', () => {
		const result = normalizeProfilePicture(
			makeJpeg(PROFILE_PICTURE_SIZE, PROFILE_PICTURE_SIZE),
		);
		const decoded = decode(result);
		expect(decoded.width).toBe(PROFILE_PICTURE_SIZE);
		expect(decoded.height).toBe(PROFILE_PICTURE_SIZE);
		expect(result[0]).toBe(0xff);
		expect(result[1]).toBe(0xd8);
	});

	it('drops metadata from the upload', () => {
		const input = makeJpeg(512, 512, 'GPS 52.52N 13.40E');
		expect(input.includes('GPS 52.52N')).toBe(true);
		expect(normalizeProfilePicture(input).includes('GPS 52.52N')).toBe(false);
	});

	it('rejects pictures of the wrong size', () => {
		expect(() => normalizeProfilePicture(makeJpeg(256, 256))).toThrow(
			ProfilePictureError,
		);
		expect(() => normalizeProfilePicture(makeJpeg(512, 400))).toThrow(
			'512x512',
		);
	});

	it('rejects files that are not JPEGs', () => {
		const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
		expect(() => normalizeProfilePicture(png)).toThrow('must be a JPEG');
		expect(() => normalizeProfilePicture(Buffer.alloc(0))).toThrow(
			ProfilePictureError,
		);
	});

	it('rejects broken JPEG data', () => {
		const broken = Buffer.concat([
			Buffer.from([0xff, 0xd8]),
			Buffer.alloc(100, 7),
		]);
		expect(() => normalizeProfilePicture(broken)).toThrow('could not be read');
	});

	it('rejects oversized uploads before decoding', () => {
		const huge = Buffer.alloc(3 * 1024 * 1024);
		huge[0] = 0xff;
		huge[1] = 0xd8;
		expect(() => normalizeProfilePicture(huge)).toThrow('too large');
	});
});

describe('decodeBase64Image', () => {
	it('accepts data URLs and plain base64', () => {
		const jpeg = makeJpeg(8, 8);
		const base64 = jpeg.toString('base64');
		expect(decodeBase64Image(`data:image/jpeg;base64,${base64}`)).toEqual(jpeg);
		expect(decodeBase64Image(base64)).toEqual(jpeg);
	});

	it('rejects other content', () => {
		expect(() => decodeBase64Image('data:image/png;base64,AAAA')).toThrow(
			ProfilePictureError,
		);
		expect(() => decodeBase64Image('not base64!')).toThrow(ProfilePictureError);
	});
});

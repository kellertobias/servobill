'use client';

import { Dialog, Transition } from '@headlessui/react';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import React, { Fragment } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { API, gql } from '@/api/index';
import { Button } from '@/components/button';
import { doToast } from '@/components/toast';
import { notifyUserChanged } from '@/hooks/require-login';

/** Must match PROFILE_PICTURE_SIZE on the server. */
const OUTPUT_SIZE = 512;
/** Larger files are refused before the browser tries to decode them. */
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

const loadImage = (src: string) =>
	new Promise<HTMLImageElement>((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error('The image could not be loaded'));
		image.src = src;
	});

/**
 * Draws the cropped area onto a 512x512 canvas and returns it as a JPEG
 * data URL. Transparent areas (PNG, WebP) become white.
 */
const cropToJpeg = async (src: string, area: Area): Promise<string> => {
	const image = await loadImage(src);
	const canvas = document.createElement('canvas');
	canvas.width = OUTPUT_SIZE;
	canvas.height = OUTPUT_SIZE;
	const context = canvas.getContext('2d');
	if (!context) {
		throw new Error('Your browser cannot process images');
	}
	context.fillStyle = '#ffffff';
	context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
	context.imageSmoothingEnabled = true;
	context.imageSmoothingQuality = 'high';
	context.drawImage(
		image,
		area.x,
		area.y,
		area.width,
		area.height,
		0,
		0,
		OUTPUT_SIZE,
		OUTPUT_SIZE,
	);
	return canvas.toDataURL('image/jpeg', 0.9);
};

function CropDialog({
	source,
	onCancel,
	onSave,
}: {
	source: string | null;
	onCancel: () => void;
	onSave: (image: string) => Promise<void>;
}) {
	const [crop, setCrop] = React.useState({ x: 0, y: 0 });
	const [zoom, setZoom] = React.useState(1);
	const [area, setArea] = React.useState<Area | null>(null);
	const [saving, setSaving] = React.useState(false);

	// Keep showing the last picture while the dialog fades out
	const [shown, setShown] = React.useState(source);

	React.useEffect(() => {
		if (source) {
			// Start every new picture centered and unzoomed
			setShown(source);
			setCrop({ x: 0, y: 0 });
			setZoom(1);
		}
	}, [source]);

	const save = async () => {
		if (!source || !area) {
			return;
		}
		setSaving(true);
		try {
			await onSave(await cropToJpeg(source, area));
		} finally {
			setSaving(false);
		}
	};

	return (
		<Transition.Root show={!!source} as={Fragment}>
			<Dialog as="div" className="relative z-50" onClose={onCancel}>
				<div className="fixed inset-0 bg-gray-500/75 backdrop-blur" />
				<div className="fixed inset-0 z-10 overflow-y-auto">
					<div className="flex min-h-full items-center justify-center p-4">
						<Dialog.Panel className="w-full max-w-lg rounded-lg bg-white shadow-xl">
							<div className="p-6 pb-4">
								<Dialog.Title className="text-base font-semibold text-gray-900">
									Crop your picture
								</Dialog.Title>
								<p className="mt-1 text-sm text-gray-500">
									Drag to move the picture, use the slider or scroll to zoom.
								</p>
								<div className="relative mt-4 h-80 w-full overflow-hidden rounded-md bg-gray-900">
									{shown && (
										<Cropper
											image={shown}
											crop={crop}
											zoom={zoom}
											aspect={1}
											cropShape="round"
											showGrid={false}
											onCropChange={setCrop}
											onZoomChange={setZoom}
											onCropComplete={(_, pixels) => setArea(pixels)}
										/>
									)}
								</div>
								<label className="mt-4 flex items-center gap-3 text-sm text-gray-700">
									Zoom
									<input
										type="range"
										min={1}
										max={4}
										step={0.01}
										value={zoom}
										onChange={(event) => setZoom(Number(event.target.value))}
										className="w-full"
										aria-label="Zoom"
									/>
								</label>
							</div>
							<div className="flex justify-end gap-3 rounded-b-lg bg-gray-50 px-6 py-3">
								<Button secondary onClick={onCancel} disabled={saving}>
									Cancel
								</Button>
								<Button primary onClick={save} disabled={saving || !area}>
									{saving ? 'Saving...' : 'Save Picture'}
								</Button>
							</div>
						</Dialog.Panel>
					</div>
				</div>
			</Dialog>
		</Transition.Root>
	);
}

/**
 * Shows the signed in user's picture and lets them upload, crop or remove it.
 */
export function ProfilePictureEditor({
	pictureUrl,
	onChange,
}: {
	pictureUrl?: string | null;
	onChange: () => void;
}) {
	const fileInput = React.useRef<HTMLInputElement>(null);
	const [source, setSource] = React.useState<string | null>(null);

	React.useEffect(() => {
		// Free the object URL of a picture once it is no longer edited
		return () => {
			if (source) {
				URL.revokeObjectURL(source);
			}
		};
	}, [source]);

	const pickFile = (file: File | undefined) => {
		if (!file) {
			return;
		}
		if (!file.type.startsWith('image/')) {
			doToast({ message: 'Please choose an image file', type: 'danger' });
			return;
		}
		if (file.size > MAX_SOURCE_BYTES) {
			doToast({
				message: 'The image is too large (max. 20 MB)',
				type: 'danger',
			});
			return;
		}
		setSource(URL.createObjectURL(file));
	};

	const changed = () => {
		onChange();
		notifyUserChanged();
	};

	const save = async (image: string) => {
		const request = API.query({
			query: gql(`
				mutation SetOwnProfilePicture($image: String!) {
					setOwnProfilePicture(image: $image) {
						id
					}
				}
			`),
			variables: { image },
		})
			.then(() => {
				setSource(null);
				changed();
			})
			.catch((error) => {
				doToast({ message: API.getErrorMessage(error), type: 'danger' });
				throw error;
			});
		doToast({
			promise: request,
			loading: 'Saving picture...',
			success: 'Picture saved',
			error: 'The picture was not saved',
		});
		// Keep the dialog open on errors so the user can try again
		await request.catch(() => undefined);
	};

	const remove = () => {
		doToast({
			promise: API.query({
				query: gql(`
					mutation RemoveOwnProfilePicture {
						removeOwnProfilePicture {
							id
						}
					}
				`),
			}).then(changed),
			loading: 'Removing picture...',
			success: 'Picture removed',
			error: 'The picture was not removed',
		});
	};

	return (
		<div className="flex items-center gap-x-6">
			{pictureUrl ? (
				<img
					src={pictureUrl}
					alt="Your profile"
					className="h-24 w-24 flex-none rounded-full bg-gray-100 object-cover"
				/>
			) : (
				<UserCircleIcon
					className="h-24 w-24 flex-none text-gray-300"
					aria-hidden="true"
				/>
			)}
			<div className="flex flex-col gap-2">
				<div className="flex gap-3">
					<Button secondary onClick={() => fileInput.current?.click()}>
						{pictureUrl ? 'Change Picture' : 'Upload Picture'}
					</Button>
					{pictureUrl && (
						<Button danger onClick={remove}>
							Remove
						</Button>
					)}
				</div>
				<p className="text-xs text-gray-500">
					JPG, PNG, WebP or any image your browser can open. You can crop it
					before saving.
				</p>
			</div>
			<input
				ref={fileInput}
				type="file"
				accept="image/*"
				className="hidden"
				data-testid="profile-picture-input"
				onChange={(event) => {
					pickFile(event.target.files?.[0]);
					// Allow choosing the same file again
					event.target.value = '';
				}}
			/>
			<CropDialog
				source={source}
				onCancel={() => setSource(null)}
				onSave={save}
			/>
		</div>
	);
}

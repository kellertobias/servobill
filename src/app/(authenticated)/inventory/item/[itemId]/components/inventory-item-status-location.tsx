import React from 'react';

import dayjs from 'dayjs';

import { Button } from '@/components/button';

import { InventoryLocationSelect } from '../../../components/inventory-location-select';

/**
 * Props for InventoryItemStatusLocation component.
 */
export interface InventoryItemStatusLocationProps {
	location: string;
	setLocation: (loc: string) => void;
	locationChanged: boolean;
	setLocationChanged: (changed: boolean) => void;
	onSave: () => void;
	nextCheck?: string | null;
	lastScanned?: string | null;
	createdAt?: string | null;
	updatedAt?: string | null;
}

/**
 * Renders the status/location card for an inventory item (location select, save button, timestamps).
 * Used on the right side of the inventory item detail page.
 *
 * @param props - InventoryItemStatusLocationProps
 */
export const InventoryItemStatusLocation: React.FC<
	InventoryItemStatusLocationProps
> = ({
	location,
	setLocation,
	locationChanged,
	setLocationChanged,
	onSave,
	nextCheck,
	lastScanned,
	createdAt,
	updatedAt,
}) => {
	return (
		<div className="rounded-lg bg-gray-50 shadow-sm ring-1 ring-gray-900/5 p-6 mb-4">
			<h2 className="text-base font-semibold leading-6 text-gray-900 mb-2">
				Status & Location
			</h2>
			<div className="mb-2">
				<InventoryLocationSelect
					value={location}
					onChange={(loc: string | null) => {
						setLocation(loc || '');
						setLocationChanged(true);
					}}
					label="Current Location"
				/>
				<Button
					className="mt-2"
					primary
					disabled={!locationChanged}
					onClick={onSave}
				>
					Save Location
				</Button>
			</div>
			<div className="mb-2 text-sm text-gray-700">
				<div>
					Next Check:{' '}
					{nextCheck ? dayjs(nextCheck).format('DD.MM.YYYY, HH:mm') : '-'}
				</div>
				<div>
					Last Scanned:{' '}
					{lastScanned ? dayjs(lastScanned).format('DD.MM.YYYY, HH:mm') : '-'}
				</div>
				<div>
					Created:{' '}
					{createdAt ? dayjs(createdAt).format('DD.MM.YYYY, HH:mm') : '-'}
				</div>
				<div>
					Updated:{' '}
					{updatedAt ? dayjs(updatedAt).format('DD.MM.YYYY, HH:mm') : '-'}
				</div>
			</div>
		</div>
	);
};

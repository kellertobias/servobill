// This file is now split into two: InventoryItemStatusCard.tsx and InventoryItemLocationEditor.tsx
// See those files for the actual components.

import React, { useEffect, useRef, useState } from 'react';

import dayjs from 'dayjs';

import { Button } from '@/components/button';

import { InventoryLocationSelect } from '../../../components/inventory-location-select';

/**
 * Props for InventoryItemLocationEditor component.
 */
export interface InventoryItemLocationEditorProps {
	location: string;
	/** Called when the location is changed and auto-saved. */
	onSave: (loc: string) => Promise<void> | void;
	/** Optional: Called when the barcode scan button is pressed. */
	onScanBarcode?: () => void;
	/** Optional: Show a loading indicator while saving. */
	saving?: boolean;
}

/**
 * Location editor for inventory item. Allows selecting a location and auto-saves on change.
 * Also provides a button to select location by scanning a barcode.
 *
 * @param props - InventoryItemLocationEditorProps
 */
export const InventoryItemLocationEditor: React.FC<
	InventoryItemLocationEditorProps
> = ({ location, onSave, onScanBarcode, saving }) => {
	const [localLocation, setLocalLocation] = useState(location);
	const [dirty, setDirty] = useState(false);
	const debounceRef = useRef<NodeJS.Timeout | null>(null);

	// Update local state if prop changes (e.g., after save)
	useEffect(() => {
		setLocalLocation(location);
		setDirty(false);
	}, [location]);

	// Auto-save when localLocation changes (debounced)
	useEffect(() => {
		if (!dirty) {
			return;
		}
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}
		debounceRef.current = setTimeout(() => {
			onSave(localLocation);
			setDirty(false);
		}, 600); // 600ms debounce
		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
		};
	}, [localLocation, dirty, onSave]);

	return (
		<div className="mb-4 flex items-end gap-2">
			<div className="flex-1">
				<InventoryLocationSelect
					value={localLocation}
					onChange={(loc: string | null) => {
						setLocalLocation(loc || '');
						setDirty(true);
					}}
					label="Current Location"
				/>
			</div>
			<Button
				className="ml-2"
				onClick={onScanBarcode}
				aria-label="Scan barcode for location"
				disabled={!onScanBarcode}
				secondary
			>
				{/* TODO: Replace with barcode icon from Heroicons if available */}
				<span role="img" aria-label="Barcode">
					📷
				</span>
			</Button>
			{saving && <span className="ml-2 text-xs text-gray-500">Saving...</span>}
		</div>
	);
};

/**
 * Props for InventoryItemStatusCard component.
 */
export interface InventoryItemStatusCardProps {
	nextCheck?: string | null;
	lastScanned?: string | null;
	createdAt?: string | null;
	updatedAt?: string | null;
}

/**
 * Displays status/timestamps for an inventory item.
 *
 * @param props - InventoryItemStatusCardProps
 */
export const InventoryItemStatusCard: React.FC<
	InventoryItemStatusCardProps
> = ({ nextCheck, lastScanned, createdAt, updatedAt }) => (
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
			Created: {createdAt ? dayjs(createdAt).format('DD.MM.YYYY, HH:mm') : '-'}
		</div>
		<div>
			Updated: {updatedAt ? dayjs(updatedAt).format('DD.MM.YYYY, HH:mm') : '-'}
		</div>
	</div>
);

/**
 * Wrapper component that composes InventoryItemLocationEditor and InventoryItemStatusCard.
 *
 * @param props - Combines all props for both subcomponents.
 */
export interface InventoryItemStatusLocationProps
	extends InventoryItemLocationEditorProps,
		InventoryItemStatusCardProps {}

export const InventoryItemStatusLocation: React.FC<
	InventoryItemStatusLocationProps
> = ({
	location,
	onSave,
	onScanBarcode,
	saving,
	nextCheck,
	lastScanned,
	createdAt,
	updatedAt,
}) => (
	<div className="">
		<h2 className="text-base font-semibold leading-6 text-gray-900 mb-2">
			Status & Location
		</h2>
		<InventoryItemLocationEditor
			location={location}
			onSave={onSave}
			onScanBarcode={onScanBarcode}
			saving={saving}
		/>
		<InventoryItemStatusCard
			nextCheck={nextCheck}
			lastScanned={lastScanned}
			createdAt={createdAt}
			updatedAt={updatedAt}
		/>
	</div>
);

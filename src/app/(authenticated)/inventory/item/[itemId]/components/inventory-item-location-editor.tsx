import React, { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/button';

import { InventoryLocationSelect } from '../../../components/inventory-location-select';

/**
 * Props for InventoryItemLocationEditor component.
 */
export interface InventoryItemLocationEditorProps {
	location: string;
	onSave: (loc: string) => Promise<void> | void;
	onScanBarcode?: () => void;
	saving?: boolean;
}

/**
 * Card for editing the location of an inventory item. Allows selecting a location, auto-saves on change, and provides a barcode scan button.
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
		<div>
			<h2 className="text-base font-semibold leading-6 text-gray-900 mb-2">
				Location
				{saving && (
					<span className="ml-2 text-xs text-gray-500">Saving...</span>
				)}
			</h2>
			<div className="flex items-start gap-2">
				<div className="flex-1">
					<InventoryLocationSelect
						value={localLocation}
						onChange={(loc: string | null) => {
							setLocalLocation(loc || '');
							setDirty(true);
						}}
					/>
				</div>
				<div className="ml-2 mt-2 pt-px">
					<Button
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
				</div>
			</div>
		</div>
	);
};

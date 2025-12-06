import { PencilIcon } from '@heroicons/react/24/outline';
import type React from 'react';
import { useState } from 'react';

import { Button } from '@/components/button';
// Import inline editing and divider utilities from invoice helpers
import { InlineEditableText } from '../../../../invoices/[invoiceId]/helpers';
import { InventoryTypeSelect } from '../../../components/inventory-type-select';

import { InventoryItemProperties } from './inventory-item-properties';

/**
 * State shape for inventory item details.
 * Now includes both type id and type name for display.
 */
export interface InventoryItemDetailsState {
	name: string;
	barcode: string;
	type: string; // type id
	typeName?: string; // human-readable type name
	properties: { key: string; value: string }[];
}

/**
 * Props for InventoryItemDetails component.
 */
export interface InventoryItemDetailsProps {
	details: InventoryItemDetailsState;
	setDetails: React.Dispatch<React.SetStateAction<InventoryItemDetailsState>>;
	detailsChanged: boolean;
	setDetailsChanged: (changed: boolean) => void;
	onSave: () => void;
}

/**
 * Renders the editable details card for an inventory item (name, barcode, type, properties).
 * Uses inline editing for fields, and invoice-style add/remove for properties.
 *
 * @param props - InventoryItemDetailsProps
 */
export const InventoryItemDetails: React.FC<InventoryItemDetailsProps> = ({
	details,
	setDetails,
	detailsChanged,
	setDetailsChanged,
	onSave,
}) => {
	// Local state to control type edit mode
	const [editingType, setEditingType] = useState(false);

	return (
		<div className="px-4 py-8 sm:mx-0 sm:px-8 sm:pb-14 xl:px-16 xl:pb-20 xl:pt-16 shadow-sm ring-1 ring-gray-900/5 rounded-lg bg-white">
			<div className="space-y-4">
				{/* Inline editable name with label */}
				<div>
					{/* Note: Label is not programmatically associated due to InlineEditableText limitations. */}
					<label className="block text-sm font-bold leading-6 text-gray-900 mb-1">
						Item Name
					</label>
					<InlineEditableText
						value={details.name}
						onChange={(name: string) => {
							setDetails((d) => ({ ...d, name }));
							setDetailsChanged(true);
						}}
						placeholder="Item name (optional)"
						empty="Item name"
						locked={false}
					/>
				</div>
				{/* Inline editable barcode with label */}
				<div>
					{/* Note: Label is not programmatically associated due to InlineEditableText limitations. */}
					<label className="block text-sm  font-bold leading-6 text-gray-900 mb-1">
						Barcode
					</label>
					<InlineEditableText
						value={details.barcode}
						onChange={(barcode: string) => {
							setDetails((d) => ({ ...d, barcode }));
							setDetailsChanged(true);
						}}
						placeholder="Barcode (optional)"
						empty="Barcode"
						locked={false}
					/>
				</div>
				{/* Type field with edit toggle */}
				<div>
					<label className="block text-sm font-bold leading-6 text-gray-900 mb-1">
						Type
					</label>
					{editingType ? (
						<InventoryTypeSelect
							value={details.type}
							onChange={(type: string | null, name: string | null) => {
								// When type changes, clear typeName (will be set by parent on reload)
								setDetails((d) => ({
									...d,
									type: type || '',
									typeName: name || undefined,
								}));
								setDetailsChanged(true);
								setEditingType(false);
							}}
							label="Type"
						/>
					) : (
						<div className="flex items-center gap-2">
							<span className="text-gray-900">
								{/* Show the type name if available, otherwise fallback to 'No type' */}
								{details.typeName || (
									<span className="text-gray-400">No type</span>
								)}
							</span>
							<button
								type="button"
								className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
								onClick={() => setEditingType(true)}
							>
								<PencilIcon className="w-3 h-3" /> Edit
							</button>
						</div>
					)}
				</div>
				{/* Properties key/value pairs, now using dedicated component */}
				<InventoryItemProperties
					properties={details.properties}
					setProperties={(props) =>
						setDetails((d) => ({ ...d, properties: props }))
					}
					setDetailsChanged={setDetailsChanged}
				/>
				<div className="pt-4 flex justify-end">
					<Button
						className="mt-4"
						primary
						disabled={!detailsChanged}
						onClick={onSave}
					>
						Save Details
					</Button>
				</div>
			</div>
		</div>
	);
};

import React from 'react';

import { Input } from '@/components/input';
import { Button } from '@/components/button';

import { InventoryTypeSelect } from '../../../components/inventory-type-select';

/**
 * State shape for inventory item details.
 */
export interface InventoryItemDetailsState {
	name: string;
	barcode: string;
	type: string;
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
 * Used on the left side of the inventory item detail page.
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
	return (
		<div className="px-4 py-8 sm:mx-0 sm:px-8 sm:pb-14 xl:px-16 xl:pb-20 xl:pt-16 shadow-sm ring-1 ring-gray-900/5 rounded-lg bg-white">
			<h2 className="text-base font-semibold leading-6 text-gray-900 mb-4">
				Item Details
			</h2>
			<div className="space-y-4">
				<Input
					label="Name"
					value={details.name}
					onChange={(name) => {
						setDetails((d) => ({ ...d, name }));
						setDetailsChanged(true);
					}}
					placeholder="Item name (optional)"
				/>
				<Input
					label="Barcode"
					value={details.barcode}
					onChange={(barcode) => {
						setDetails((d) => ({ ...d, barcode }));
						setDetailsChanged(true);
					}}
					placeholder="Barcode (optional)"
				/>
				<InventoryTypeSelect
					value={details.type}
					onChange={(type: string | null) => {
						setDetails((d) => ({ ...d, type: type || '' }));
						setDetailsChanged(true);
					}}
					label="Type"
				/>
				{/* Properties key/value pairs */}
				<div>
					<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
						Properties
					</label>
					{details.properties && details.properties.length > 0 ? (
						details.properties.map(({ key, value }, idx) => (
							<div key={idx} className="flex gap-2 mb-2">
								<Input
									value={key}
									onChange={(k) => {
										const newProps = [...details.properties];
										newProps[idx] = { ...newProps[idx], key: k };
										setDetails((d) => ({ ...d, properties: newProps }));
										setDetailsChanged(true);
									}}
									placeholder="Key"
									className="flex-1"
								/>
								<Input
									value={value}
									onChange={(v) => {
										const newProps = [...details.properties];
										newProps[idx] = { ...newProps[idx], value: v };
										setDetails((d) => ({ ...d, properties: newProps }));
										setDetailsChanged(true);
									}}
									placeholder="Value"
									className="flex-1"
								/>
								<Button
									small
									secondary
									onClick={() => {
										const newProps = details.properties.filter(
											(_, i) => i !== idx,
										);
										setDetails((d) => ({ ...d, properties: newProps }));
										setDetailsChanged(true);
									}}
								>
									Remove
								</Button>
							</div>
						))
					) : (
						<div className="text-gray-400 text-sm mb-2">No properties set.</div>
					)}
					<Button
						small
						onClick={() => {
							setDetails((d) => ({
								...d,
								properties: [...(d.properties || []), { key: '', value: '' }],
							}));
							setDetailsChanged(true);
						}}
					>
						Add Property
					</Button>
				</div>
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
	);
};

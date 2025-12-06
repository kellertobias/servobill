import React from 'react';

import {
	InlineEditableText,
	InvoiceItemDivider,
	InvoiceRowDeleteButton,
} from '../../../../invoices/[invoiceId]/helpers';

/**
 * Props for InventoryItemProperties component.
 */
export interface InventoryItemPropertiesProps {
	properties: { key: string; value: string }[];
	setProperties: (properties: { key: string; value: string }[]) => void;
	setDetailsChanged: (changed: boolean) => void;
}

/**
 * Renders the editable list of properties for an inventory item, with header, inline editing,
 * add-divider above and between each row, and delete/add functionality for each property.
 *
 * @param props - InventoryItemPropertiesProps
 */
export const InventoryItemProperties: React.FC<
	InventoryItemPropertiesProps
> = ({ properties, setProperties, setDetailsChanged }) => {
	// Handler to add a property at a specific index
	const handleAddProperty = (index: number) => {
		const newProps = [
			...properties.slice(0, index),
			{ key: '', value: '' },
			...properties.slice(index),
		];
		setProperties(newProps);
		setDetailsChanged(true);
	};

	// Handler to remove a property at a specific index
	const handleRemoveProperty = (index: number) => {
		const newProps = properties.filter((_, i) => i !== index);
		setProperties(newProps);
		setDetailsChanged(true);
	};

	return (
		<div className="pt-6">
			{/* Header row */}
			<div className="flex gap-2 items-center mb-2 text-xs font-semibold text-gray-700">
				<div className="w-1/3">Property</div>
				<div className="w-2/3">Value</div>
			</div>
			{/* Divider between header and first property */}
			<InvoiceItemDivider
				onAddItem={() => handleAddProperty(0)}
				locked={false}
			/>
			{/* Properties list */}
			{properties && properties.length > 0 ? (
				properties.map(({ key, value }, idx) => (
					<React.Fragment key={idx}>
						<div className="relative">
							<div className="flex gap-2 items-center py-2 text-sm">
								{/* Inline editable key */}
								<div className="w-1/3">
									<InlineEditableText
										value={key}
										onChange={(k: string) => {
											const newProps = [...properties];
											newProps[idx] = { ...newProps[idx], key: k };
											setProperties(newProps);
											setDetailsChanged(true);
										}}
										placeholder="Property"
										empty="Property"
										locked={false}
										textRight={false}
									/>
								</div>
								{/* Inline editable value */}
								<div className="w-2/3">
									<InlineEditableText
										value={value}
										onChange={(v: string) => {
											const newProps = [...properties];
											newProps[idx] = { ...newProps[idx], value: v };
											setProperties(newProps);
											setDetailsChanged(true);
										}}
										placeholder="Value"
										empty="Value"
										locked={false}
										textRight={false}
									/>
								</div>
								{/* Remove property button, always present */}
								<InvoiceRowDeleteButton
									onClick={() => handleRemoveProperty(idx)}
								/>
							</div>
						</div>
						{/* Divider/add button between each row (except after last) */}
						{idx < properties.length - 1 && (
							<InvoiceItemDivider
								onAddItem={() => handleAddProperty(idx + 1)}
								locked={false}
							/>
						)}
					</React.Fragment>
				))
			) : (
				<div className="text-gray-400 text-sm mb-2">No properties set.</div>
			)}
			{/* Add property at the end */}
			<InvoiceItemDivider
				onAddItem={() => handleAddProperty(properties.length)}
				locked={false}
			/>
		</div>
	);
};

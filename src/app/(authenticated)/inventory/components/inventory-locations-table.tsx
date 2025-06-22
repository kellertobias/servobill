import React from 'react';

import { Table } from '@/components/table';

import { InventoryItem, InventoryLocation } from '../types';

/**
 * @file Component for rendering a table of inventory locations.
 */

interface InventoryLocationsTableProps {
	data: InventoryLocation[];
	loading: boolean;
}

/**
 * Renders a table displaying inventory locations and their associated items.
 *
 * @param props - The component props.
 * @param props.data - The array of inventory locations to display.
 * @param props.loading - A boolean indicating if the data is currently loading.
 * @returns The rendered table component.
 */
export function InventoryLocationsTable({
	data,
	loading,
}: InventoryLocationsTableProps) {
	return (
		<Table<InventoryLocation>
			title="Inventory Locations"
			data={data}
			loading={loading}
			keyField="id"
			getCategory={(location) => location.name}
			columns={[
				{
					key: 'name',
					title: 'Location Name',
					className: 'py-5',
					render: (location) => (
						<>
							<div className="text-sm font-medium leading-6 text-gray-900">
								{location.name}
							</div>
							<div className="mt-1 text-xs leading-5 text-gray-500">
								<span className="text-gray-900">
									{location.itemCount || 0} items
								</span>
							</div>
						</>
					),
				},
				{
					key: 'barcode',
					title: 'Barcode',
					className: 'py-5',
					render: (location) => (
						<>
							<div className="text-xs leading-6 text-gray-500">
								{location.barcode ? (
									<span className="font-mono text-gray-900">
										{location.barcode}
									</span>
								) : (
									<span className="text-gray-400">No barcode</span>
								)}
							</div>
						</>
					),
				},
				{
					key: 'items',
					title: 'Items',
					className: 'py-5',
					render: (location) => (
						<>
							<div className="text-xs leading-6 text-gray-500">
								{location.items && location.items.length > 0 ? (
									location.items.slice(0, 3).map((item: InventoryItem) => (
										<div key={item.id} className="mb-1">
											<span className="text-gray-900">{item.name}</span>
											{item.type && (
												<span className="text-gray-500 ml-1">
													({item.type.name})
												</span>
											)}
										</div>
									))
								) : (
									<span className="text-gray-400">No items</span>
								)}
								{location.items && location.items.length > 3 && (
									<div className="text-xs text-gray-400 mt-1">
										+{location.items.length - 3} more items
									</div>
								)}
							</div>
						</>
					),
				},
			]}
		/>
	);
}

'use client';

import React from 'react';

import { Table } from '@/components/table';

import { InventoryItem, InventoryType } from '../types';

/**
 * @file Component for rendering a table of inventory types.
 */

interface InventoryTypesTableProps {
	data: InventoryType[];
	loading: boolean;
	/** Optional callback when a row is clicked (for navigation to detail page). */
	onRowClick?: (type: InventoryType) => void;
}

/**
 * Renders a table displaying inventory types and their associated items.
 *
 * @param props - The component props.
 * @param props.data - The array of inventory types to display.
 * @param props.loading - A boolean indicating if the data is currently loading.
 * @param props.onRowClick - Optional callback for row click (for navigation).
 * @returns The rendered table component.
 */
export function InventoryTypesTable({
	data,
	loading,
	onRowClick,
}: InventoryTypesTableProps) {
	return (
		<Table<InventoryType>
			title="Inventory Types"
			data={data}
			loading={loading}
			keyField="id"
			getCategory={(type) => type.name}
			getLineLink={onRowClick ? (type) => () => onRowClick(type) : undefined}
			columns={[
				{
					key: 'name',
					title: 'Type Name',
					className: 'py-5',
					render: (type) => (
						<>
							<div className="text-sm font-medium leading-6 text-gray-900">
								{type.name}
							</div>
							<div className="mt-1 text-xs leading-5 text-gray-500">
								<span className="text-gray-900">{type.itemCount} items</span>
							</div>
						</>
					),
				},
				{
					key: 'properties',
					title: 'Properties',
					className: 'py-5',
					render: (type) => (
						<>
							<div className="text-xs leading-6 text-gray-500">
								{type.properties.length > 0 ? (
									type.properties.map((prop: string, index: number) => (
										<span
											key={index}
											className="inline-block bg-gray-100 rounded-full px-2 py-1 mr-1 mb-1 text-xs"
										>
											{prop}
										</span>
									))
								) : (
									<span className="text-gray-400">No properties</span>
								)}
							</div>
						</>
					),
				},
				{
					key: 'items',
					title: 'Items',
					className: 'py-5',
					render: (type) => (
						<>
							<div className="text-xs leading-6 text-gray-500">
								{type.items && type.items.length > 0 ? (
									type.items.slice(0, 3).map((item: InventoryItem) => (
										<div key={item.id} className="mb-1">
											<span className="text-gray-900">{item.name}</span>
											{item.location && (
												<span className="text-gray-500 ml-1">
													@ {item.location.name}
												</span>
											)}
										</div>
									))
								) : (
									<span className="text-gray-400">No items</span>
								)}
								{type.items && type.items.length > 3 && (
									<div className="text-xs text-gray-400 mt-1">
										+{type.items.length - 3} more items
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

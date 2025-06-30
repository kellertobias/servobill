'use client';

import React from 'react';

import { Table } from '@/components/table';
import { Button } from '@/components/button';

import { InventoryLocationsListQuery } from '@/common/gql/graphql';

/**
 * @file Component for rendering a table of inventory types.
 */

type InventoryLocationCategory = InventoryLocationsListQuery['entries'][number];
type InventoryLocation = NonNullable<
	InventoryLocationCategory['children']
>[number];
type InventoryLocationFlattened = InventoryLocation & {
	parentName: string;
	isCategory: boolean;
};

interface InventoryLocationTableProps {
	title: string | React.ReactNode;
	data: InventoryLocationCategory[];
	loading: boolean;
	/** Optional callback when a row is clicked (for navigation to detail page). */
	onRowClick?: (location: InventoryLocationFlattened) => void;
	/** Optional callback to open the edit drawer. */
	openEditDrawer?: (id: string) => void;
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
export function InventoryLocationsTable({
	title,
	data,
	loading,
	onRowClick,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	openEditDrawer,
}: InventoryLocationTableProps) {
	const itemsFlattened = (data || []).flatMap(
		(location): InventoryLocationFlattened[] => [
			{
				...location,
				itemCount: 0,
				isCategory: true,
				parentName: location.name,
			},
			...(location.children?.map((c) => ({
				...c,
				isCategory: false,
				parentName: location.name,
			})) || []),
		],
	);

	return (
		<Table<InventoryLocationFlattened>
			title={title}
			data={itemsFlattened}
			loading={loading}
			keyField="id"
			getCategory={(location) => location.parentName}
			getLineLink={
				onRowClick ? (location) => () => onRowClick(location) : undefined
			}
			columns={[
				{
					key: 'name',
					title: 'Location Name',
					className: 'py-5',
					colSpan: 3,
					render: (location) => (
						<>
							<div className="text-sm font-medium leading-6 text-gray-900">
								{location.isCategory ? (
									<span className="text-black font-bold">
										Category Root: <br />
									</span>
								) : null}
								{location.name}
							</div>
							{!location.isCategory && (
								<div className="mt-1 text-xs leading-5 text-gray-500">
									<span className="text-gray-900">
										{location.itemCount} items
									</span>
								</div>
							)}
						</>
					),
				},
				{
					key: 'actions',
					title: 'Actions',
					className: 'py-5',
					colSpan: 1,
					render: (location) => (
						<>
							<div className="text-xs leading-6 text-gray-500 flex justify-end gap-2">
								<Button secondary onClick={() => openEditDrawer?.(location.id)}>
									Edit
								</Button>
							</div>
						</>
					),
				},
			]}
		/>
	);
}

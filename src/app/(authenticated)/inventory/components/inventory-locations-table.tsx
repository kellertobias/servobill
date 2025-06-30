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
	parent: InventoryLocationCategory;
	parentName: string;
	isCategory: boolean;
	isEmpty?: boolean;
};

interface InventoryLocationTableProps {
	title: string | React.ReactNode;
	data: InventoryLocationCategory[];
	loading: boolean;
	/** Optional callback when a row is clicked (for navigation to detail page). */
	onRowClick?: (locationId: string) => void;
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
	/**
	 * Flattens the inventory location data, ensuring every category is represented in the table.
	 * If a category has no children, a dummy child is added to allow the category divider to render.
	 */
	const itemsFlattened: InventoryLocationFlattened[] = (data || []).flatMap(
		(location: InventoryLocationCategory): InventoryLocationFlattened[] =>
			location.children && location.children.length > 0
				? location.children.map((c: InventoryLocation) => ({
						...c,
						isCategory: false,
						parent: location,
						parentName: location.name,
					}))
				: [
						{
							id: `${location.id}-empty`,
							name: '(No locations in this category)',
							itemCount: 0,
							isCategory: false,
							parent: location,
							parentName: location.name,
							isEmpty: true,
						} as InventoryLocationFlattened,
					],
	);

	return (
		<Table<InventoryLocationFlattened>
			title={title}
			data={itemsFlattened}
			loading={loading}
			keyField="id"
			getCategory={(location) => location.parentName}
			notFound={{
				title: 'No locations found',
				subtitle: 'There are no locations to show in this category',
			}}
			renderCategoryDivider={(location) => (
				<div
					onClick={(e) => {
						if (
							e.target instanceof HTMLButtonElement ||
							e.currentTarget.closest('button')
						) {
							return;
						}
						onRowClick?.(location.parent.id);
					}}
					className="text-sm font-medium leading-6 text-gray-900 flex justify-between"
				>
					<div className="flex-1 font-bold">{location.parentName}</div>
					<div className="flex justify-end gap-2">
						<Button
							small
							secondary
							onClick={() => openEditDrawer?.(location.parent.id)}
						>
							Edit
						</Button>
					</div>
				</div>
			)}
			getLineLink={
				onRowClick ? (location) => () => onRowClick(location.id) : undefined
			}
			columns={[
				{
					key: 'name',
					title: 'Location Name',
					className: 'py-5',
					render: (location) => (
						<>
							<div className="text-sm font-medium leading-6 text-gray-900">
								{location.isCategory ? (
									<span className="text-black font-bold">
										Category Root: <br />
									</span>
								) : null}
								{location.isEmpty ? (
									<span className="italic text-gray-400">
										No locations in this category
									</span>
								) : (
									location.name
								)}
							</div>
							{!location.isCategory && !location.isEmpty && (
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
					render: (location) => (
						<>
							<div className="text-xs leading-6 text-gray-500 flex justify-end gap-2">
								{!location.isEmpty && (
									<Button
										secondary
										onClick={() => openEditDrawer?.(location.id)}
									>
										Edit
									</Button>
								)}
							</div>
						</>
					),
				},
			]}
		/>
	);
}

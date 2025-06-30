'use client';

import React from 'react';

import { Table } from '@/components/table';
import { Button } from '@/components/button';

import { InventoryTypesListQuery } from '@/common/gql/graphql';

/**
 * @file Component for rendering a table of inventory types.
 */

type InventoryTypeCategory = InventoryTypesListQuery['entries'][number];
type InventoryType = NonNullable<InventoryTypeCategory['children']>[number];
type InventoryTypeFlattened = InventoryType & {
	parentName: string;
	isCategory: boolean;
};

interface InventoryTypesTableProps {
	title: string | React.ReactNode;
	data: InventoryTypeCategory[];
	loading: boolean;
	/** Optional callback when a row is clicked (for navigation to detail page). */
	onRowClick?: (type: InventoryType) => void;
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
export function InventoryTypesTable({
	title,
	data,
	loading,
	onRowClick,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	openEditDrawer,
}: InventoryTypesTableProps) {
	const itemsFlattened = (data || []).flatMap(
		(type): InventoryTypeFlattened[] => [
			{
				...type,
				itemCount: 0,
				isCategory: true,
				parentName: type.name,
			},
			...(type.children?.map((c) => ({
				...c,
				isCategory: false,
				parentName: type.name,
			})) || []),
		],
	);

	return (
		<Table<InventoryTypeFlattened>
			title={title}
			data={itemsFlattened}
			loading={loading}
			keyField="id"
			getCategory={(type) => type.parentName}
			getLineLink={onRowClick ? (type) => () => onRowClick(type) : undefined}
			columns={[
				{
					key: 'name',
					title: 'Type Name',
					className: 'py-5',
					colSpan: 3,
					render: (type) => (
						<>
							<div className="text-sm font-medium leading-6 text-gray-900">
								{type.isCategory ? (
									<span className="text-black font-bold">
										Category Root: <br />
									</span>
								) : null}
								{type.name}
							</div>
							{!type.isCategory && (
								<div className="mt-1 text-xs leading-5 text-gray-500">
									<span className="text-gray-900">{type.itemCount} items</span>
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
					render: (type) => (
						<>
							<div className="text-xs leading-6 text-gray-500 flex justify-end gap-2">
								<Button secondary onClick={() => openEditDrawer?.(type.id)}>
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

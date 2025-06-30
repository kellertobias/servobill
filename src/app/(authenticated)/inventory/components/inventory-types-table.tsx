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
	parent: InventoryTypeCategory;
	parentName: string;
	isCategory: boolean;
	isEmpty?: boolean; // Indicates a dummy row for empty category
};

interface InventoryTypesTableProps {
	title: string | React.ReactNode;
	data: InventoryTypeCategory[];
	loading: boolean;
	/** Optional callback when a row is clicked (for navigation to detail page). */
	onRowClick?: (typeId: string) => void;
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
	/**
	 * Flattens the inventory location data, ensuring every category is represented in the table.
	 * If a category has no children, a dummy child is added to allow the category divider to render.
	 */
	const itemsFlattened: InventoryTypeFlattened[] = (data || []).flatMap(
		(type: InventoryTypeCategory): InventoryTypeFlattened[] =>
			type.children && type.children.length > 0
				? type.children.map((c: InventoryType) => ({
						...c,
						isCategory: false,
						parent: type,
						parentName: type.name,
					}))
				: [
						{
							id: `${type.id}-empty`,
							name: '(No types in this category)',
							itemCount: 0,
							isCategory: false,
							parent: type,
							parentName: type.name,
							isEmpty: true,
						} as InventoryTypeFlattened,
					],
	);

	return (
		<Table<InventoryTypeFlattened>
			title={title}
			data={itemsFlattened}
			loading={loading}
			keyField="id"
			getCategory={(type) => type.parentName}
			notFound={{
				title: 'No types found',
				subtitle: 'There are no types to show in this category',
			}}
			renderCategoryDivider={(type) => (
				<div
					onClick={(e) => {
						if (
							e.target instanceof HTMLButtonElement ||
							e.currentTarget.closest('button')
						) {
							return;
						}
						onRowClick?.(type.parent.id);
					}}
					className="text-sm font-medium leading-6 text-gray-900 flex justify-between"
				>
					<div className="flex-1 font-bold">{type.parentName}</div>
					<div className="flex justify-end gap-2">
						<Button small secondary onClick={() => openEditDrawer?.(type.id)}>
							Edit
						</Button>
					</div>
				</div>
			)}
			getLineLink={onRowClick ? (type) => () => onRowClick(type.id) : undefined}
			columns={[
				{
					key: 'name',
					title: 'Type Name',
					className: 'py-5',
					render: (type) => (
						<>
							<div className="text-sm font-medium leading-6 text-gray-900">
								{type.isCategory ? (
									<span className="text-black font-bold">
										Category Root: <br />
									</span>
								) : null}
								{type.isEmpty ? (
									<span className="italic text-gray-400">
										No types in this category
									</span>
								) : (
									type.name
								)}
							</div>
							{!type.isCategory && !type.isEmpty && (
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
					render: (type) => (
						<>
							<div className="text-xs leading-6 text-gray-500 flex justify-end gap-2">
								{!type.isEmpty && (
									<Button secondary onClick={() => openEditDrawer?.(type.id)}>
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

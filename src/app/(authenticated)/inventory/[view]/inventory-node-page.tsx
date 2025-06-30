'use client';

import '@/components/dev-utils';

import { notFound, useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

import { PencilIcon, PlusIcon } from '@heroicons/react/24/outline';

import { PageCard, PageContent } from '@/components/page';
import { Button } from '@/components/button';
import { API, gql } from '@/api/index';

import { InventoryHeader } from '../components/inventory-header';
import { InventoryTypesTable } from '../components/inventory-types-table';
import { InventoryLocationsTable } from '../components/inventory-locations-table';
import {
	InventoryView,
	InventoryType,
	InventoryLocation,
	InventoryItem,
} from '../types';
import { EditInventoryTypeDrawer } from '../components/edit-inventory-type-drawer';
import { EditInventoryLocationDrawer } from '../components/edit-inventory-location-drawer';
import { EditInventoryItemDrawer } from '../components/edit-inventory-item-drawer';

import { useInventoryListData } from './use-inventory-list-data';

const ALLOWED_VIEWS = new Set(['type', 'location']);

/**
 * Custom hook to fetch inventory items for the current node or all items at root.
 * @param id - The current type/location ID (or undefined/null for root)
 * @param view - 'type' or 'location'
 * @returns { items, loading }
 */
function useNodeInventoryItems(id: string | undefined, view: InventoryView) {
	const [items, setItems] = useState<InventoryItem[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		let cancelled = false;
		async function fetchItems() {
			setLoading(true);
			const where = id
				? view === 'type'
					? { typeId: id }
					: { locationId: id }
				: {};
			const res = await API.query({
				query: gql(`
					query NodeInventoryItems($where: InventoryItemWhereInput) {
						inventoryItems(where: $where) {
							id
							name
							barcode
							state
							type { id name }
							location { id name }
							nextCheck
							lastScanned
						}
					}
				`) as unknown as import('@graphql-typed-document-node/core').TypedDocumentNode<
					unknown,
					unknown
				>,
				variables: { where },
			});
			const itemsResult = res as { inventoryItems?: InventoryItem[] };
			if (!cancelled) {
				setItems(itemsResult.inventoryItems || []);
			}
			setLoading(false);
		}
		fetchItems();
		return () => {
			cancelled = true;
		};
	}, [id, view]);

	return { items, loading };
}

/**
 * InventoryItemsList displays a list of inventory items for all visible nodes.
 * Shows type and location for each item.
 * Responsive: side-by-side with the main table on desktop, below on mobile.
 * @param items - Array of inventory items to display
 * @param loading - Loading state
 */
function InventoryItemsList({
	items,
	loading,
}: {
	items: InventoryItem[];
	loading: boolean;
}) {
	const router = useRouter();

	return (
		<PageCard className="w-full md:w-3/5 mt-4 md:mt-0">
			<div className="font-bold text-lg mb-2">Items</div>
			{loading ? (
				<div className="p-4 text-gray-400">Loading items...</div>
			) : items.length === 0 ? (
				<div className="p-4 text-gray-400">No items found for these nodes.</div>
			) : (
				<ul className="divide-y divide-gray-200 cursor-pointer">
					{items.map((item) => (
						<li
							key={item.id}
							className="p-3 flex flex-col gap-1"
							onClick={() => {
								router.push(`/inventory/item/${item.id}`);
							}}
						>
							<span className="font-medium text-gray-900">
								{item.name || `(Unnamed ${item.type?.name || 'Item'})`}
							</span>
							<span className="text-xs text-gray-500">
								Barcode: {item.barcode || '—'}
							</span>
							<span className="text-xs text-gray-500">State: {item.state}</span>
							<span className="text-xs text-gray-500">
								Type: {item.type?.name || '—'}
							</span>
							<span className="text-xs text-gray-500">
								Location: {item.location?.name || '—'}
							</span>
							<span className="text-xs text-gray-500">
								Last scanned: {item.lastScanned}
							</span>
						</li>
					))}
				</ul>
			)}
		</PageCard>
	);
}

/**
 * Main inventory list page for /inventory/[view].
 * Handles switching between types and locations based on the view param.
 */
export default function InventoryNodePage({
	params,
	reloadRef,
}: {
	params: { view: InventoryView; id?: string };
	reloadRef?: React.MutableRefObject<() => void>;
}) {
	const router = useRouter();
	const view = params.view;
	const { entries, node, loading, searchQuery, setSearchQuery, reload } =
		useInventoryListData({
			view: params.view,
			id: params.id,
		});

	useEffect(() => {
		if (reloadRef) {
			reloadRef.current = reload;
		}
	}, [reload, reloadRef]);

	// const reloadRef = useRef<() => void>(() => {});
	// Create refs for the drawers to control them imperatively
	const typeDrawerRef = useRef<{
		openDrawer: (id: string, parentId?: string) => void;
	}>(null);
	const locationDrawerRef = useRef<{
		openDrawer: (id: string, parentId?: string) => void;
	}>(null);
	const itemDrawerRef = useRef<{
		openDrawer: (id: string, parentId?: string) => void;
	}>(null);

	const openEditDrawer = React.useCallback(
		(id: string) => {
			if (typeDrawerRef.current) {
				typeDrawerRef.current?.openDrawer(id);
			} else {
				locationDrawerRef.current?.openDrawer(id);
			}
		},
		[typeDrawerRef, locationDrawerRef],
	);

	// Extract 'fromId' from the query params for back navigation
	const searchParams =
		typeof window === 'undefined'
			? null
			: new URLSearchParams(window.location.search);
	const fromId = searchParams?.get('fromId');

	if (!ALLOWED_VIEWS.has(view)) {
		return notFound();
	}

	// Only show items for the current node, or all items if at root
	const { items, loading: itemsLoading } = useNodeInventoryItems(
		params.id,
		view,
	);

	/**
	 * Opens the item drawer in 'new' mode for creating a new item, preselecting the current node as parent if available.
	 */
	const openNewItemDrawer = () => {
		// If viewing a type or location node, preselect as parent
		const parentTypeId = view === 'type' ? node?.id ?? undefined : undefined;
		const parentLocationId =
			view === 'location' ? node?.id ?? undefined : undefined;
		itemDrawerRef.current?.openDrawer('new', parentTypeId || parentLocationId);
	};

	/**
	 * Opens the type or location drawer in 'new' mode, preselecting the current node as parent if available.
	 */
	const openNewTypeOrLocationDrawer = () => {
		if (view === 'type') {
			typeDrawerRef.current?.openDrawer('new', node?.id ?? undefined);
		} else {
			locationDrawerRef.current?.openDrawer('new', node?.id ?? undefined);
		}
	};

	/**
	 * NodeInfoCard displays the current type/location node context and action buttons.
	 * Shown above the tables when a node is selected (not at root).
	 */
	const NodeInfoCard = node ? (
		<PageCard className="mb-4">
			<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
				<div>
					<span className="font-semibold">
						Inventory {view === 'type' ? 'Type' : 'Location'}
					</span>
					{node && <span className="text-gray-500"> - {node.name}</span>}
				</div>
				<div className="flex flex-col md:flex-row gap-2 justify-end">
					<Button
						secondary
						className="min-w-[130px] text-center justify-center"
						onClick={() => {
							if (fromId) {
								router.push(`/inventory/${view}/${fromId}`);
							} else {
								router.push(`/inventory/${view}`);
							}
						}}
					>
						Back to parent
					</Button>
					<Button
						icon={PencilIcon}
						secondary
						className="min-w-[130px] text-center justify-center"
						onClick={() => openEditDrawer?.(node.id)}
					>
						Edit
					</Button>
				</div>
			</div>
		</PageCard>
	) : null;

	return (
		<>
			{view === 'type' ? (
				<EditInventoryTypeDrawer ref={typeDrawerRef} onReload={reload} />
			) : (
				<EditInventoryLocationDrawer
					ref={locationDrawerRef}
					onReload={reload}
				/>
			)}
			<EditInventoryItemDrawer ref={itemDrawerRef} onReload={reload} />
			<PageContent
				title={
					<>{view === 'type' ? 'Inventory Types' : 'Inventory Locations'}</>
				}
				noCard
				contentClassName="pt-6"
				right={
					<>
						<div className="flex flex-row gap-2 mb-4">
							<Button
								icon={PlusIcon}
								onClick={openNewItemDrawer}
								className="min-w-[130px]"
								header
							>
								Add Item
							</Button>
							<Button
								icon={PlusIcon}
								onClick={openNewTypeOrLocationDrawer}
								className="min-w-[130px]"
								header
							>
								{view === 'type' ? 'Add Type' : 'Add Location'}
							</Button>
						</div>
					</>
				}
			>
				<InventoryHeader
					activeTab={view === 'type' ? 'types' : 'locations'}
					onTabChange={(tab) =>
						router.push(`/inventory/${tab === 'types' ? 'type' : 'location'}`)
					}
					searchQuery={searchQuery}
					onSearchQueryChange={setSearchQuery}
				/>

				{/* Node info card above the tables, only if a node is selected */}
				{NodeInfoCard}
				{/* Responsive flex: items list first, then main table (side by side on desktop, stacked on mobile) */}
				<div className="flex flex-col md:flex-row md:items-start gap-0 md:gap-4">
					{/* Items list appears first (left/above) */}
					<InventoryItemsList items={items} loading={itemsLoading} />
					<div className="flex-1 min-w-0 col-span-2">
						<PageCard noPadding>
							{view === 'type' ? (
								<InventoryTypesTable
									title={<div className="pt-6">Inventory Types</div>}
									data={entries as InventoryType[]}
									loading={loading}
									/**
									 * When a row is clicked, navigate to the selected type's page, passing the current node id as 'fromId' in the query params.
									 * This allows the child page to know where the user came from for back navigation.
									 */
									onRowClick={(typeId) => {
										const from = node?.id ?? '';
										router.push(`/inventory/type/${typeId}?fromId=${from}`);
									}}
									openEditDrawer={openEditDrawer}
								/>
							) : (
								<InventoryLocationsTable
									title={<div className="pt-6">Inventory Locations</div>}
									data={entries as InventoryLocation[]}
									loading={loading}
									/**
									 * When a row is clicked, navigate to the selected location's page, passing the current node id as 'fromId' in the query params.
									 * This allows the child page to know where the user came from for back navigation.
									 */
									onRowClick={(locationId) => {
										const from = node?.id ?? '';
										router.push(
											`/inventory/location/${locationId}?fromId=${from}`,
										);
									}}
									openEditDrawer={openEditDrawer}
								/>
							)}
						</PageCard>
					</div>
				</div>
			</PageContent>
		</>
	);
}

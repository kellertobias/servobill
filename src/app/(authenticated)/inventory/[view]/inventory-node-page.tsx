'use client';

import '@/components/dev-utils';

import { notFound, useRouter } from 'next/navigation';
import React, { useEffect, useRef } from 'react';

import { PageCard, PageContent } from '@/components/page';
import { Button } from '@/components/button';

import { InventoryHeader } from '../components/inventory-header';
import { InventoryTypesTable } from '../components/inventory-types-table';
import { InventoryLocationsTable } from '../components/inventory-locations-table';
import { InventoryView, InventoryType, InventoryLocation } from '../types';
import { EditInventoryTypeDrawer } from '../components/edit-inventory-type-drawer';
import { EditInventoryLocationDrawer } from '../components/edit-inventory-location-drawer';

import { useInventoryListData } from './use-inventory-list-data';

const ALLOWED_VIEWS = new Set(['type', 'location']);

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
	const typeDrawerRef = useRef<{ openDrawer: (id: string) => void }>(null);
	const locationDrawerRef = useRef<{ openDrawer: (id: string) => void }>(null);

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

	const title = (
		<div className="pt-4 -mb-2 flex flex-row justify-between">
			<div>
				Inventory {view === 'type' ? 'Types' : 'Locations'}
				{node && <span className="text-gray-500"> - {node.name}</span>}
			</div>

			{node && (
				<div className="flex justify-end gap-2">
					<Button
						small
						secondary
						/**
						 * Navigates back to the parent node. If a 'fromId' query param is present, use it to go back to the previous node.
						 * If 'fromId' is null or empty, go to the root inventory page for the current view.
						 */
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
					<Button small secondary onClick={() => openEditDrawer?.(node.id)}>
						Edit
					</Button>
				</div>
			)}
		</div>
	);

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
			<PageContent
				title={
					<>{view === 'type' ? 'Inventory Types' : 'Inventory Locations'}</>
				}
				noCard
				contentClassName="pt-6"
			>
				<InventoryHeader
					activeTab={view === 'type' ? 'types' : 'locations'}
					onTabChange={(tab) =>
						router.push(`/inventory/${tab === 'types' ? 'type' : 'location'}`)
					}
					searchQuery={searchQuery}
					onSearchQueryChange={setSearchQuery}
				/>
				<PageCard noPadding>
					{view === 'type' ? (
						<InventoryTypesTable
							title={title}
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
							title={title}
							data={entries as InventoryLocation[]}
							loading={loading}
							/**
							 * When a row is clicked, navigate to the selected location's page, passing the current node id as 'fromId' in the query params.
							 * This allows the child page to know where the user came from for back navigation.
							 */
							onRowClick={(locationId) => {
								const from = node?.id ?? '';
								router.push(`/inventory/location/${locationId}?fromId=${from}`);
							}}
							openEditDrawer={openEditDrawer}
						/>
					)}
				</PageCard>
			</PageContent>
		</>
	);
}

'use client';

import '@/components/dev-utils';

import { notFound, useRouter } from 'next/navigation';
import React, { useEffect } from 'react';

import { PageCard, PageContent } from '@/components/page';
import { Button } from '@/components/button';

import { InventoryHeader } from '../components/inventory-header';
import { InventoryTypesTable } from '../components/inventory-types-table';
import { InventoryLocationsTable } from '../components/inventory-locations-table';
import { InventoryView, InventoryType, InventoryLocation } from '../types';

import { useInventoryListData } from './use-inventory-list-data';

const ALLOWED_VIEWS = new Set(['type', 'location']);

/**
 * Main inventory list page for /inventory/[view].
 * Handles switching between types and locations based on the view param.
 */
export default function InventoryNodePage({
	params,
	reloadRef,
	openEditDrawer,
}: {
	params: { view: InventoryView; id?: string };
	reloadRef?: React.MutableRefObject<() => void>;
	openEditDrawer?: (id: string) => void;
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

	if (!ALLOWED_VIEWS.has(view)) {
		return notFound();
	}

	console.log({ entries, node });

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
						onClick={() =>
							router.push(`/inventory/${view}/${node.parent || ''}`)
						}
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
		<PageContent
			title={<>{view === 'type' ? 'Inventory Types' : 'Inventory Locations'}</>}
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
						onRowClick={(typeId) => router.push(`/inventory/type/${typeId}`)}
						openEditDrawer={openEditDrawer}
					/>
				) : (
					<InventoryLocationsTable
						title={title}
						data={entries as InventoryLocation[]}
						loading={loading}
						onRowClick={(locationId) =>
							router.push(`/inventory/location/${locationId}`)
						}
						openEditDrawer={openEditDrawer}
					/>
				)}
			</PageCard>
		</PageContent>
	);
}

'use client';

import React, { useRef } from 'react';

import { InventoryView } from '../../types';
import { EditInventoryTypeDrawer } from '../../components/edit-inventory-type-drawer';
import { EditInventoryLocationDrawer } from '../../components/edit-inventory-location-drawer';
import InventoryNodePage from '../inventory-node-page';

/**
 * Inventory detail page for /inventory/[view]/[id].
 * Shows the name, edit button, children, and items for a type or location.
 */
export default function InventoryDetailPage({
	params,
}: {
	params: { view: InventoryView; id: string };
}) {
	const { view } = params;

	const reloadRef = useRef<() => void>(() => {});
	// Create refs for the drawers to control them imperatively
	const typeDrawerRef = useRef<{ openDrawer: (id: string) => void }>(null);
	const locationDrawerRef = useRef<{ openDrawer: (id: string) => void }>(null);

	const openDrawer = React.useCallback(
		(id: string) => {
			if (typeDrawerRef.current) {
				typeDrawerRef.current?.openDrawer(id);
			} else {
				locationDrawerRef.current?.openDrawer(id);
			}
		},
		[typeDrawerRef, locationDrawerRef],
	);

	return (
		<>
			{/* Edit drawer: render the appropriate drawer based on view */}
			{view === 'type' ? (
				<EditInventoryTypeDrawer ref={typeDrawerRef} reloadRef={reloadRef} />
			) : (
				<EditInventoryLocationDrawer
					ref={locationDrawerRef}
					reloadRef={reloadRef}
				/>
			)}
			<InventoryNodePage
				params={params}
				reloadRef={reloadRef}
				openEditDrawer={openDrawer}
			/>
		</>
	);
}

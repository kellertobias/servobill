'use client';

import React from 'react';

import type { InventoryView } from '../../types';
import InventoryNodePage from '../inventory-node-page';

/**
 * Inventory detail page for /inventory/[view]/[id].
 * Shows the name, edit button, children, and items for a type or location.
 */
export default function InventoryDetailPage({
	params,
}: {
	params: Promise<{ view: InventoryView; id: string }>;
}) {
	const resolvedParams = React.use(params);
	return <InventoryNodePage params={resolvedParams} />;
}

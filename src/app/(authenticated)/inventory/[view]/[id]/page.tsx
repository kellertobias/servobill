'use client';

import React from 'react';

import { InventoryView } from '../../types';
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
	return <InventoryNodePage params={params} />;
}

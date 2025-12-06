'use client';

import React from 'react';

import type { InventoryView } from '../types';

import InventoryNodePage from './inventory-node-page';

/**
 * Main inventory list page for /inventory/[view].
 * Handles switching between types and locations based on the view param.
 */
export default function InventoryListPage({
	params,
}: {
	params: Promise<{ view: InventoryView }>;
}) {
	const resolvedParams = React.use(params);
	return <InventoryNodePage params={resolvedParams} />;
}

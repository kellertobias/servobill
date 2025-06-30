'use client';

import React from 'react';

import { InventoryView } from '../types';

import InventoryNodePage from './inventory-node-page';

/**
 * Main inventory list page for /inventory/[view].
 * Handles switching between types and locations based on the view param.
 */
export default function InventoryListPage({
	params,
}: {
	params: { view: InventoryView };
}) {
	return <InventoryNodePage params={params} />;
}

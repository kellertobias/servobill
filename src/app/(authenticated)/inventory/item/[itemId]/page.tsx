'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

import { API, gql } from '@/api/index';
import { useLoadData } from '@/hooks/load-data';

import { InventoryItem } from '../../types';

/**
 * Inventory item detail page for /inventory/item/[itemId].
 * Fetches and displays all details for a single inventory item.
 *
 * @param params - Route params containing the itemId.
 * @returns The rendered item detail page.
 */
export default function InventoryItemDetailPage({
	params,
}: {
	params: { itemId: string };
}) {
	const { itemId } = params;
	const router = useRouter();

	// Fetch the inventory item data by ID
	const { data, loading } = useLoadData(async () => {
		const res = await API.query({
			query: gql(`
                query InventoryItemDetail($id: String!) {
                    inventoryItem(id: $id) {
                        id
                        name
                        barcode
                        state
                        location { id name }
                        type { id name }
                        nextCheck
                        lastScanned
                    }
                }
            `),
			variables: { id: itemId },
		});
		return res.inventoryItem as InventoryItem;
	});

	if (loading || !data) {
		return <div>Loading...</div>;
	}

	return (
		<div className="pt-6 px-4 max-w-2xl mx-auto">
			<h1 className="text-2xl font-bold mb-4">{data.name}</h1>
			<div className="mb-2">
				Barcode: {data.barcode || <span className="text-gray-400">None</span>}
			</div>
			<div className="mb-2">State: {data.state}</div>
			<div className="mb-2">
				Type: {data.type?.name || <span className="text-gray-400">None</span>}
			</div>
			<div className="mb-2">
				Location:{' '}
				{data.location?.name || <span className="text-gray-400">None</span>}
			</div>
			<div className="mb-2">Next Check: {data.nextCheck}</div>
			<div className="mb-2">Last Scanned: {data.lastScanned}</div>
			{/* Add more fields as needed */}
			<button
				className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
				onClick={() => router.back()}
			>
				Back
			</button>
		</div>
	);
}

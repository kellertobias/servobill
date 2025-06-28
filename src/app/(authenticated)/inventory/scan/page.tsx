'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { API, gql } from '@/api/index';

import { FindInventoryItemQuery } from '@/common/gql/graphql';

/**
 * Inventory scanner page for /inventory/scan.
 * - Top: Camera/scanner view (barcode/QR scanner)
 * - Middle: Scanned/found item or not-found message
 * - Bottom: Action buttons and 'Open Item' button
 */
export default function InventoryScanPage() {
	const [scannedCode, setScannedCode] = useState<string | null>(null);
	const [item, setItem] = useState<
		FindInventoryItemQuery['inventoryItems'][number] | null
	>(null);
	const [notFound, setNotFound] = useState(false);
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	// Simulate scanning: in a real app, use a camera/scanner component here
	// For now, use a placeholder input for barcode/QR code
	const handleScan = useCallback(async (code: string) => {
		setScannedCode(code);
		setLoading(true);
		setNotFound(false);
		setItem(null);
		// Lookup item by barcode
		const res = await API.query({
			query: gql(`
                query FindInventoryItem($barcode: String!) {
                    inventoryItems(where: { barcode: $barcode }) {
                        id
                        name
                        barcode
                        state
                        type { id name }
                        location { id name }
                    }
                }
            `),
			variables: { barcode: code },
		});
		const found =
			res.inventoryItems && res.inventoryItems.length > 0
				? res.inventoryItems[0]
				: null;
		setItem(found);
		setNotFound(!found);
		setLoading(false);
	}, []);

	return (
		<div className="flex flex-col min-h-screen bg-white">
			{/* Top: Camera/Scanner View */}
			<div className="flex-1 flex items-center justify-center bg-gray-100 border-b">
				{/* TODO: Replace with real camera/scanner component */}
				<div className="flex flex-col items-center">
					<div className="mb-2 text-gray-500">Camera/Scanner View</div>
					<input
						type="text"
						placeholder="Simulate scan: enter barcode and press Enter"
						className="border px-3 py-2 rounded"
						onKeyDown={(e) => {
							if (e.key === 'Enter' && e.currentTarget.value) {
								handleScan(e.currentTarget.value);
								e.currentTarget.value = '';
							}
						}}
					/>
				</div>
			</div>

			{/* Middle: Scanned/Found Item or Not Found Message */}
			<div className="flex-1 flex flex-col items-center justify-center">
				{/* Show the last scanned code if present */}
				{scannedCode && (
					<div className="mb-4 px-3 py-1 bg-gray-200 rounded text-sm font-mono text-gray-700">
						Scanned code: <span className="font-semibold">{scannedCode}</span>
					</div>
				)}
				{loading ? (
					<div className="text-gray-500">Looking up item...</div>
				) : item ? (
					<div className="w-full max-w-md p-4 border rounded bg-gray-50">
						<div className="text-lg font-bold mb-2">{item.name}</div>
						<div className="mb-1">Barcode: {item.barcode}</div>
						<div className="mb-1">State: {item.state}</div>
						<div className="mb-1">
							Type:{' '}
							{item.type?.name || <span className="text-gray-400">None</span>}
						</div>
						<div className="mb-1">
							Location:{' '}
							{item.location?.name || (
								<span className="text-gray-400">None</span>
							)}
						</div>
					</div>
				) : notFound ? (
					<div className="text-red-500">No item found for scanned code.</div>
				) : (
					<div className="text-gray-400">
						Scan a barcode or QR code to find an item.
					</div>
				)}
			</div>

			{/* Bottom: Action Buttons */}
			<div className="flex flex-col items-center p-4 border-t bg-gray-50">
				<div className="flex space-x-2 mb-2">
					{/* Add more action buttons as needed */}
					<button
						className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
						onClick={() => setItem(null)}
						disabled={loading}
					>
						Clear
					</button>
				</div>
				<button
					className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
					disabled={!item}
					onClick={() => item && router.push(`/inventory/item/${item.id}`)}
				>
					Open Item
				</button>
			</div>
		</div>
	);
}

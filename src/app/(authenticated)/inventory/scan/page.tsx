'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import clsx from 'clsx';

import { API, gql } from '@/api/index';

import { InventoryActivityForm } from '../item/[itemId]/components/inventory-activity-form';

import { FindInventoryItemQuery } from '@/common/gql/graphql';

/**
 * Dynamically import the Scanner to avoid SSR issues (camera access is browser-only).
 * @see https://www.npmjs.com/package/@yudiel/react-qr-scanner
 */
const Scanner = dynamic(
	() => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner),
	{ ssr: false },
);

/**
 * Inventory scanner page for /inventory/scan.
 * - Top: Camera/scanner view (barcode/QR scanner)
 * - Middle: Scanned/found item or not-found message
 * - Bottom: Action buttons and 'Open Item' button
 */
export default function InventoryScanPage() {
	const [scannedCode, setScannedCode] = useState<string | null>(null);
	const [item, setItem] = useState<
		FindInventoryItemQuery['inventoryItem'] | null
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
                    inventoryItem( barcode: $barcode ) {
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
            `),
			variables: { barcode: code },
		});
		const found = res.inventoryItem || null;

		setItem(found);
		setNotFound(!found);
		setLoading(false);
	}, []);

	return (
		<div className="flex flex-col  bg-white">
			{/* Top: Camera/Scanner View */}
			<div className="flex-0 flex items-center justify-center bg-gray-100 border-b pt-8 pb-4">
				{/* Camera/Scanner Component */}
				<div className="flex flex-col items-center w-full">
					{/*
					 * Scanner from @yudiel/react-qr-scanner
					 * - onScan: called with an array of detected codes
					 * - onError: handle camera errors (optional)
					 * - constraints: set facingMode to 'environment' for rear camera
					 */}
					<Scanner
						// Custom styles for the scanner container and video
						styles={{
							container: { width: '100%', maxWidth: 200, margin: '0 auto' },
							video: { width: '100%', borderRadius: 8 },
						}}
						constraints={{ facingMode: 'environment' }}
						onScan={(codes) => {
							console.log('codes', codes);
							// Only handle the first detected code
							const code = codes[0]?.rawValue;
							if (code && code !== scannedCode) {
								handleScan(code);
							}
						}}
						onError={(err: unknown) => {
							console.error('Camera error:', err);
						}}
					/>
					{scannedCode && (
						<div className="mt-2 px-3 py-1 bg-gray-200 rounded text-sm font-mono text-gray-700">
							Scanned code: <span className="font-semibold">{scannedCode}</span>
						</div>
					)}
				</div>
			</div>

			{/* Middle: Scanned/Found Item or Not Found Message */}
			<div className="flex-1 flex flex-col items-center justify-center">
				<div className="flex flex-col py-2">
					{/* Show the last scanned code if present */}
					{loading ? (
						<div className="text-gray-500">Looking up item...</div>
					) : item ? (
						<div className="w-full max-w-2xl p-4 ">
							<div className="text-lg font-bold mb-2">{item.name}</div>
							<div className="mb-1">
								<b>State:</b> {item.state}
							</div>
							<div className="mb-1">
								<b>Type:</b>{' '}
								{item.type?.name || <span className="text-gray-400">None</span>}
							</div>
							<div className="mb-1">
								<b>Location:</b>{' '}
								{item.location?.name || (
									<span className="text-gray-400">None</span>
								)}
							</div>
							<div className="mb-1">
								<b>Next Check:</b> {item.nextCheck}
							</div>
							<div className="mb-1">
								<b>Last Scanned:</b> {item.lastScanned}
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

				<div
					className={clsx(
						'flex flex-row items-start justify-center gap-2 p-4 border-t bg-gray-50 w-full',
						{
							'flex-1': !item,
						},
					)}
				>
					{/* Add more action buttons as needed */}
					<button
						className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
						onClick={() => {
							setItem(null);
							setScannedCode(null);
						}}
						disabled={loading}
					>
						Clear
					</button>
					<button
						className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
						disabled={!item}
						onClick={() => item && router.push(`/inventory/item/${item.id}`)}
					>
						Open Item
					</button>
				</div>
				{item && (
					<div className="flex-1 w-full bg-gray-50 px-4">
						<InventoryActivityForm
							itemId={item.id}
							reload={() => {
								setItem(null);
								setScannedCode(null);
							}}
						/>
					</div>
				)}
			</div>
		</div>
	);
}

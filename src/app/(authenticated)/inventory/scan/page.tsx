'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
 * - Top: Camera/scanner view (barcode/QR scanner) or manual input (toggleable)
 * - Middle: Scanned/found item or not-found message
 * - Bottom: Action buttons and 'Open Item' button
 *
 * Features:
 * - Toggle between camera scanner and manual input (persisted in localStorage)
 * - Manual input auto-focuses on page load, after clear, and after activity form submit
 * - Camera scanner uses @yudiel/react-qr-scanner
 */
export default function InventoryScanPage() {
	const [scannedCode, setScannedCode] = useState<string | null>(null);
	const [item, setItem] = useState<
		FindInventoryItemQuery['inventoryItem'] | null
	>(null);
	const [notFound, setNotFound] = useState(false);
	const [loading, setLoading] = useState(false);
	const [useCamera, setUseCamera] = useState(true); // true = camera, false = manual input
	const router = useRouter();
	const inputRef = useRef<HTMLInputElement>(null);

	// On mount, restore scanner mode from localStorage
	useEffect(() => {
		const stored = localStorage.getItem('inventoryScanMode');
		if (stored === 'manual') {
			setUseCamera(false);
		}
	}, []);

	// Persist scanner mode to localStorage
	useEffect(() => {
		localStorage.setItem('inventoryScanMode', useCamera ? 'camera' : 'manual');
	}, [useCamera]);

	/**
	 * Handles scanning (from camera or manual input)
	 * @param code Barcode/QR code string
	 */
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

	/**
	 * Focuses the manual input field (if present)
	 */
	const focusInput = useCallback(() => {
		if (inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, []);

	// Refocus input when switching to manual mode
	useEffect(() => {
		if (!useCamera) {
			focusInput();
		}
	}, [useCamera, focusInput]);

	return (
		<div className="flex flex-col  bg-white">
			{/* Top: Mode Toggle & Scanner/Input */}
			<div className="flex-0 flex flex-col items-center justify-center bg-gray-100 border-b pt-4 pb-4">
				{/* Toggle between camera and manual input */}
				<div
					className="flex items-center gap-2 cursor-pointer select-none mb-2"
					onClick={() => setUseCamera((v) => !v)}
				>
					<span className="text-sm font-medium items-center gap-2">
						Scan with{' '}
						<span className={clsx({ 'font-bold': useCamera })}>Camera</span> /{' '}
						<span className={clsx({ 'font-bold': !useCamera })}>Manual</span>
					</span>
				</div>
				<div className="flex flex-col items-center w-full">
					{useCamera ? (
						// Camera/Scanner Component
						<Scanner
							styles={{
								container: { width: '100%', maxWidth: 200, margin: '0 auto' },
								video: { width: '100%', borderRadius: 8 },
							}}
							constraints={{ facingMode: 'environment' }}
							onScan={(codes) => {
								console.log('codes', codes);
								const code = codes[0]?.rawValue;
								if (code && code !== scannedCode) {
									handleScan(code);
								}
							}}
							onError={(err: unknown) => {
								console.error('Camera error:', err);
							}}
						/>
					) : (
						// Manual input field for barcode/QR code
						<form
							className="w-full max-w-xs flex flex-row gap-2 items-center"
							onSubmit={async (e) => {
								e.preventDefault();
								const value = inputRef.current?.value?.trim();
								if (inputRef.current && value) {
									await handleScan(value);
									inputRef.current.value = '';
								}
							}}
						>
							<input
								ref={inputRef}
								type="text"
								placeholder={scannedCode || 'Enter barcode or QR code'}
								className="border rounded px-3 py-2 w-full text-center text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
								disabled={loading}
								defaultValue={scannedCode || ''}
								autoFocus
							/>
							<button
								type="submit"
								className="px-4 py-2.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
								disabled={loading}
							>
								Scan
							</button>
						</form>
					)}
					{useCamera && scannedCode && (
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
							setNotFound(false);
							if (!useCamera) {
								// Refocus input after clear
								setTimeout(focusInput, 0);
							}
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
					<div className="flex-1 w-full bg-gray-50 px-4 pb-4">
						<InventoryActivityForm
							itemId={item.id}
							reload={() => {
								setItem(null);
								setScannedCode(null);
								setNotFound(false);
								if (!useCamera) {
									// Refocus input after activity form submit
									setTimeout(focusInput, 0);
								}
							}}
						/>
					</div>
				)}
			</div>
		</div>
	);
}

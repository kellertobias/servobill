'use client';

import React from 'react';

import { API, gql } from '@/api/index';
import { useLoadData } from '@/hooks/load-data';
import { PageContent } from '@/components/page';
import { LoadingSkeleton } from '@/components/loading';
import { doToast } from '@/components/toast';

import {
	InventoryItemDetails,
	InventoryItemDetailsState,
} from './components/inventory-item-details';
import { InventoryItemStatusCard } from './components/inventory-item-status-card';
import { InventoryItemLocationEditor } from './components/inventory-item-location-editor';
import { InventoryActivityFeed } from './components/inventory-activity-feed';

/**
 * Inventory item detail page for /inventory/item/[itemId].
 *
 * This page follows the same design paradigm as the invoice detail page:
 * - Uses PageContent for consistent framing
 * - 3-column grid: right for status/location/activity, left for details
 * - Card layout for each section
 * - Footer for actions (if needed)
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

	// Fetch the inventory item data by ID
	const { data, /* setData, */ loading, reload } = useLoadData(async () => {
		const res = await API.query({
			query: gql(`
                query InventoryItemDetail($id: String!) {
                    inventoryItem(id: $id) {
                        id
                        name
                        barcode
                        state
                        location { id name }
                        type { id name properties }
                        properties { key value }
                        nextCheck
                        lastScanned
                        createdAt
                        updatedAt
                        history { type state date note }
                    }
                }
            `),
			variables: { id: itemId },
		});
		return res.inventoryItem;
	});

	// Local state for editable fields
	const [details, setDetails] = React.useState<InventoryItemDetailsState>(
		() => ({
			name: data?.name || '',
			barcode: data?.barcode || '',
			type: data?.type?.id || '',
			typeName: data?.type?.name || undefined,
			properties: data?.properties || [],
		}),
	);
	const [location, setLocation] = React.useState(data?.location?.id || '');
	const [status, setStatus] = React.useState(data?.state || 'DEFAULT');
	const [detailsChanged, setDetailsChanged] = React.useState(false);
	const [savingLocation, setSavingLocation] = React.useState(false);

	React.useEffect(() => {
		if (data) {
			setDetails({
				name: data.name || '',
				barcode: data.barcode || '',
				type: data.type?.id || '',
				typeName: data.type?.name || undefined,
				properties: data.properties || [],
			});
			setLocation(data.location?.id || '');
			setStatus(data.state || 'DEFAULT');
			setDetailsChanged(false);
		}
	}, [data]);

	/**
	 * Handler for barcode scan button (to be implemented)
	 */
	// eslint-disable-next-line unicorn/consistent-function-scoping
	function handleScanBarcode() {
		// TODO: Implement barcode scanning logic
		alert('Barcode scan not implemented yet.');
	}

	/**
	 * Handler for saving item details (name, barcode, type, properties)
	 */
	const handleSaveDetails = async () => {
		await API.query({
			query: gql(`
                mutation UpdateInventoryItem($id: String!, $data: InventoryItemInput!) {
                    updateInventoryItem(id: $id, data: $data) { id }
                }
            `),
			variables: {
				id: itemId,
				data: {
					name: details.name,
					barcode: details.barcode,
					typeId: details.type,
					properties: details.properties,
				},
			},
		});
		reload();
	};

	/**
	 * Handler for auto-saving item location (called by InventoryItemLocationEditor on change).
	 * @param newLocation - The new location ID to save
	 */
	const handleSaveLocation = async (newLocation: string) => {
		setSavingLocation(true);
		await API.query({
			query: gql(`
                mutation UpdateInventoryItemLocation($id: String!, $locationId: String!) {
                    updateInventoryItem(id: $id, data: { locationId: $locationId }) { id }
                }
            `),
			variables: {
				id: itemId,
				locationId: newLocation,
			},
		});
		setLocation(newLocation);
		setSavingLocation(false);
		reload();
	};

	/**
	 * Handler for changing item status (state) with auto-save and loading indicator
	 */
	const handleStatusChange = async (newStatus: string) => {
		setStatus(newStatus);
		doToast({ message: 'Saving status...' });
		try {
			await API.query({
				query: gql(`
                    mutation UpdateInventoryItemStatus($id: String!, $state: InventoryItemState!) {
                        updateInventoryItem(id: $id, data: { state: $state }) { id }
                    }
                `),
				variables: {
					id: itemId,
					state: newStatus,
				},
			});
			doToast({ message: 'Status saved!', type: 'success' });
		} catch {
			doToast({ message: 'Failed to save status', type: 'danger' });
		}
		reload();
	};

	if (loading) {
		return (
			<PageContent
				title={`Inventory Item: Loading...`}
				noPadding
				contentClassName="overflow-hidden pt-6"
			>
				<LoadingSkeleton />
			</PageContent>
		);
	}

	if (!data) {
		return (
			<PageContent
				title={`Inventory Item: Not Found`}
				noPadding
				contentClassName="overflow-hidden pt-6"
				notFound
			/>
		);
	}

	return (
		<PageContent
			title={`Inventory Item: ${data.barcode || data.id}`}
			noPadding
			contentClassName="px-6 pt-6"
		>
			<div className="pb-16">
				<div className="mx-auto grid max-w-2xl grid-cols-1 grid-rows-1 items-start gap-x-8 gap-y-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
					{/* Right: Status/location/activity */}
					<div className="lg:col-start-3 lg:row-end-1 flex flex-col gap-6">
						<div className="rounded-lg bg-gray-50 shadow-sm ring-1 ring-gray-900/5 p-6 mb-4">
							<InventoryItemStatusCard
								status={status}
								onStatusChange={handleStatusChange}
								nextCheck={data.nextCheck}
								lastScanned={data.lastScanned}
								createdAt={data.createdAt}
								updatedAt={data.updatedAt}
							/>
							<div className="mt-6 pt-6 border-t border-t-gray-200 border-t-px" />
							<InventoryItemLocationEditor
								location={location}
								onSave={handleSaveLocation}
								onScanBarcode={handleScanBarcode}
								saving={savingLocation}
							/>
						</div>
						<InventoryActivityFeed
							history={data.history}
							itemId={data.id}
							reload={reload}
						/>
					</div>
					{/* Left: Item details card */}
					<div className="-mx-4 sm:mx-0 lg:col-span-2 lg:row-span-2 lg:row-end-2">
						<InventoryItemDetails
							details={details}
							setDetails={setDetails}
							detailsChanged={detailsChanged}
							setDetailsChanged={setDetailsChanged}
							onSave={handleSaveDetails}
						/>
					</div>
				</div>
			</div>
		</PageContent>
	);
}

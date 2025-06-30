'use client';

import React from 'react';

import dayjs from 'dayjs';

import { API, gql } from '@/api/index';
import { useLoadData } from '@/hooks/load-data';
import { Input } from '@/components/input';
import { Button } from '@/components/button';

import { InventoryTypeSelect } from '../../components/inventory-type-select';
import { InventoryLocationSelect } from '../../components/inventory-location-select';

// TODO: Implement InventoryActivityFeed and InventoryActivityForm in this directory
// import { InventoryActivityFeed, InventoryActivityForm } from './inventory-activity';

/**
 * Inventory item detail page for /inventory/item/[itemId].
 * Structured like the invoice detail page: left for details, right for status/location/activity.
 *
 * - Left: Editable item details (name, barcode, type, properties)
 * - Right: Status/location (editable), nextCheck, lastScanned, createdAt, updatedAt, and activity/history
 * - Each section has its own save/submit button
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
	// const router = useRouter(); // Unused

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
	const [details, setDetails] = React.useState(() => ({
		name: data?.name || '',
		barcode: data?.barcode || '',
		type: data?.type?.id || '',
		properties: data?.properties || [],
	}));
	const [location, setLocation] = React.useState(data?.location?.id || '');
	const [detailsChanged, setDetailsChanged] = React.useState(false);
	const [locationChanged, setLocationChanged] = React.useState(false);

	React.useEffect(() => {
		if (data) {
			setDetails({
				name: data.name || '',
				barcode: data.barcode || '',
				type: data.type?.id || '',
				properties: data.properties || [],
			});
			setLocation(data.location?.id || '');
			setDetailsChanged(false);
			setLocationChanged(false);
		}
	}, [data]);

	// Handler for saving details
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

	// Handler for saving location
	const handleSaveLocation = async () => {
		await API.query({
			query: gql(`
                mutation UpdateInventoryItemLocation($id: String!, $locationId: String!) {
                    updateInventoryItem(id: $id, data: { locationId: $locationId }) { id }
                }
            `),
			variables: {
				id: itemId,
				locationId: location,
			},
		});
		reload();
	};

	if (loading || !data) {
		return <div>Loading...</div>;
	}

	return (
		<div className="pb-16">
			{/* Title */}
			<div className="mb-6">
				<h1 className="text-2xl font-bold">
					Inventory Item: {data.barcode || data.id}
				</h1>
			</div>
			{/* Main card layout: left details, right status/activity */}
			<div className="mx-auto grid max-w-4xl grid-cols-1 gap-x-8 gap-y-8 lg:grid-cols-3">
				{/* Right: Status/location/activity */}
				<div className="lg:col-start-3 lg:row-end-1 flex flex-col gap-6">
					{/* Status/location box */}
					<div className="rounded-lg bg-gray-50 shadow-sm ring-1 ring-gray-900/5 p-6 mb-4">
						<h2 className="text-base font-semibold leading-6 text-gray-900 mb-2">
							Status & Location
						</h2>
						<div className="mb-2">
							<InventoryLocationSelect
								value={location}
								onChange={(loc: string | null) => {
									setLocation(loc || '');
									setLocationChanged(true);
								}}
								label="Current Location"
							/>
							<Button
								className="mt-2"
								primary
								disabled={!locationChanged}
								onClick={handleSaveLocation}
							>
								Save Location
							</Button>
						</div>
						<div className="mb-2 text-sm text-gray-700">
							<div>
								Next Check:{' '}
								{data.nextCheck
									? dayjs(data.nextCheck).format('DD.MM.YYYY, HH:mm')
									: '-'}
							</div>
							<div>
								Last Scanned:{' '}
								{data.lastScanned
									? dayjs(data.lastScanned).format('DD.MM.YYYY, HH:mm')
									: '-'}
							</div>
							<div>
								Created:{' '}
								{data.createdAt
									? dayjs(data.createdAt).format('DD.MM.YYYY, HH:mm')
									: '-'}
							</div>
							<div>
								Updated:{' '}
								{data.updatedAt
									? dayjs(data.updatedAt).format('DD.MM.YYYY, HH:mm')
									: '-'}
							</div>
						</div>
					</div>
					{/* Activity/history feed */}
					<div>
						{/* TODO: Implement InventoryActivityFeed and InventoryActivityForm in this directory */}
						{/* <InventoryActivityFeed
							itemId={itemId}
							history={data.history || []}
						/> */}
					</div>
				</div>
				{/* Left: Item details */}
				<div className="lg:col-span-2 lg:row-span-2 lg:row-end-2 px-4 py-8 shadow-sm ring-1 ring-gray-900/5 rounded-lg bg-white">
					<h2 className="text-base font-semibold leading-6 text-gray-900 mb-4">
						Item Details
					</h2>
					<div className="space-y-4">
						<Input
							label="Name"
							value={details.name}
							onChange={(name) => {
								setDetails((d) => ({ ...d, name }));
								setDetailsChanged(true);
							}}
							placeholder="Item name (optional)"
						/>
						<Input
							label="Barcode"
							value={details.barcode}
							onChange={(barcode) => {
								setDetails((d) => ({ ...d, barcode }));
								setDetailsChanged(true);
							}}
							placeholder="Barcode (optional)"
						/>
						<InventoryTypeSelect
							value={details.type}
							onChange={(type: string | null) => {
								setDetails((d) => ({ ...d, type: type || '' }));
								setDetailsChanged(true);
							}}
							label="Type"
						/>
						{/* Properties key/value pairs */}
						<div>
							<label className="block text-sm font-medium leading-6 text-gray-900 mb-1">
								Properties
							</label>
							{details.properties && details.properties.length > 0 ? (
								details.properties.map(({ key, value }, idx) => (
									<div key={idx} className="flex gap-2 mb-2">
										<Input
											value={key}
											onChange={(k) => {
												const newProps = [...details.properties];
												newProps[idx] = { ...newProps[idx], key: k };
												setDetails((d) => ({ ...d, properties: newProps }));
												setDetailsChanged(true);
											}}
											placeholder="Key"
											className="flex-1"
										/>
										<Input
											value={value}
											onChange={(v) => {
												const newProps = [...details.properties];
												newProps[idx] = { ...newProps[idx], value: v };
												setDetails((d) => ({ ...d, properties: newProps }));
												setDetailsChanged(true);
											}}
											placeholder="Value"
											className="flex-1"
										/>
										<Button
											small
											secondary
											onClick={() => {
												const newProps = details.properties.filter(
													(_, i) => i !== idx,
												);
												setDetails((d) => ({ ...d, properties: newProps }));
												setDetailsChanged(true);
											}}
										>
											Remove
										</Button>
									</div>
								))
							) : (
								<div className="text-gray-400 text-sm mb-2">
									No properties set.
								</div>
							)}
							<Button
								small
								onClick={() => {
									setDetails((d) => ({
										...d,
										properties: [
											...(d.properties || []),
											{ key: '', value: '' },
										],
									}));
									setDetailsChanged(true);
								}}
							>
								Add Property
							</Button>
						</div>
						<Button
							className="mt-4"
							primary
							disabled={!detailsChanged}
							onClick={handleSaveDetails}
						>
							Save Details
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

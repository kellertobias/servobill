'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

import { API, gql } from '@/api/index';
import { useLoadData } from '@/hooks/load-data';
import { Drawer } from '@/components/drawer';
import { Input } from '@/components/input';

import { InventoryHeader } from '../../components/inventory-header';
import { InventoryTypesTable } from '../../components/inventory-types-table';
import { InventoryLocationsTable } from '../../components/inventory-locations-table';
import {
	InventoryView,
	InventoryTypeDetail,
	InventoryLocationDetail,
} from '../../types';

/**
 * Inventory detail page for /inventory/[view]/[id].
 * Shows the name, edit button, children, and items for a type or location.
 */
export default function InventoryDetailPage({
	params,
}: {
	params: { view: InventoryView; id: string };
}) {
	const { view, id } = params;
	const router = useRouter();
	const [editOpen, setEditOpen] = useState(false);
	const [editName, setEditName] = useState('');
	const [editLoading, setEditLoading] = useState(false);

	// Load detail data
	const { data, loading, reload } = useLoadData(async () => {
		if (view === 'type') {
			const res = await API.query({
				query: gql(`
                    query InventoryTypeDetail($id: String!) {
                        inventoryType(id: $id) {
                            id
                            name
                            children { id name }
                            items { id name state }
                        }
                    }
                `),
				variables: { id },
			});
			return res.inventoryType as InventoryTypeDetail;
		} else {
			const res = await API.query({
				query: gql(`
                    query InventoryLocationDetail($id: String!) {
                        inventoryLocation(id: $id) {
                            id
                            name
                            children { id name }
                            items { id name state }
                        }
                    }
                `),
				variables: { id },
			});
			return res.inventoryLocation as InventoryLocationDetail;
		}
	});

	// Open edit drawer with current name
	const openEdit = () => {
		setEditName(data?.name || '');
		setEditOpen(true);
	};

	// Handle save (edit name)
	const handleSave = async () => {
		setEditLoading(true);
		try {
			await (view === 'type'
				? API.query({
						query: gql(`
                            mutation UpdateInventoryType(
                                $id: String!,
                                $input: UpdateInventoryTypeInput!
                            ) {
                                updateInventoryType(id: $id, input: $input) { id name }
                            }
                        `),
						variables: { id, input: { name: editName } },
					})
				: API.query({
						query: gql(`
                            mutation UpdateInventoryLocation(
                                $id: String!,
                                $input: UpdateInventoryLocationInput!
                            ) {
                                updateInventoryLocation(id: $id, input: $input) { id name }
                            }
                        `),
						variables: { id, input: { name: editName } },
					}));
			setEditOpen(false);
			reload();
		} finally {
			setEditLoading(false);
		}
	};

	if (loading || !data) {
		return <div>Loading...</div>;
	}

	return (
		<div className="pt-6">
			<InventoryHeader mode={view} name={data.name} onEdit={openEdit} />
			<div className="py-6">
				{/* Children list */}
				{view === 'type' ? (
					<InventoryTypesTable
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						data={data.children as any}
						loading={false}
						onRowClick={(type) => router.push(`/inventory/type/${type.id}`)}
					/>
				) : (
					<InventoryLocationsTable
						data={data.children}
						loading={false}
						onRowClick={(location) =>
							router.push(`/inventory/location/${location.id}`)
						}
					/>
				)}
				{/* Items list (reuse types table for now, or create a new component if needed) */}
				<div className="mt-8">
					<h3 className="text-lg font-semibold mb-2">Items</h3>
					{/* TODO: Replace with InventoryItemsTable if available */}
					<ul>
						{data.items.map((item) => (
							<li
								key={item.id}
								className="cursor-pointer hover:underline"
								onClick={() => router.push(`/inventory/item/${item.id}`)}
							>
								{item.name} ({item.state})
							</li>
						))}
					</ul>
				</div>
			</div>
			{/* Edit drawer */}
			<Drawer
				id={editOpen ? 'edit-inventory' : null}
				title={`Edit ${view === 'type' ? 'Type' : 'Location'}`}
				subtitle={undefined}
				onClose={() => setEditOpen(false)}
				onCancel={() => setEditOpen(false)}
				onSave={handleSave}
				saveText={editLoading ? 'Saving...' : 'Save'}
				cancelText="Cancel"
			>
				<div className="py-2">
					<Input
						label="Name"
						value={editName}
						onChange={setEditName}
						placeholder={view === 'type' ? 'Type name' : 'Location name'}
					/>
				</div>
			</Drawer>
		</div>
	);
}

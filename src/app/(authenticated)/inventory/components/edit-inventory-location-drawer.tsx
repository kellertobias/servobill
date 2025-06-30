import React, { forwardRef } from 'react';

import { Drawer } from '@/components/drawer';
import { Input } from '@/components/input';
import { API, gql } from '@/api/index';
import { useLoadData, useSaveCallback } from '@/hooks/load-data';
import SelectInput from '@/components/select-input';

import { useInventoryDrawer } from './use-inventory-drawer';
import { useLocations } from './use-locations';

/**
 * Drawer component for editing an inventory location's properties: parent, name, barcode.
 * Uses useLoadData and useSaveCallback for data management, following the ExpenseOverlay pattern.
 * Exposes an imperative openDrawer(id) method via ref.
 * Accepts a reloadRef to allow parent to trigger reloads after save.
 *
 * @param {object} props
 * @param {React.MutableRefObject<() => void>} props.reloadRef - Ref to set the reload function for parent usage.
 * @param {React.Ref<{ openDrawer: (id: string) => void }>} ref - Ref to control the drawer imperatively.
 */
const EditInventoryLocationDrawer = forwardRef(
	(
		{
			onReload,
		}: {
			onReload: () => void;
		},
		ref: React.Ref<{ openDrawer: (id: string) => void }>,
	) => {
		const { drawerId, handleClose } = useInventoryDrawer({
			ref,
		});

		const { locations: allLocations } = useLocations(drawerId);

		// useLoadData for fetching and managing location data
		const { data, setData, initialData, reload, loading } = useLoadData(
			async ({ locationId }) => {
				if (!locationId) {
					return null;
				}
				if (locationId === 'new') {
					return { id: 'new', name: '', barcode: '', parent: null };
				}
				// Fetch location detail
				type LocationDetail = {
					id: string;
					name?: string;
					barcode?: string;
					parent?: string | null;
				};
				const res = await API.query({
					query: gql(`
						query InventoryLocationDetail($id: String!) {
							inventoryLocation(id: $id) {
								id
								name
								barcode
								parent
							}
						}
					`),
					variables: { id: locationId },
				});
				const loc = (res.inventoryLocation || {}) as LocationDetail;
				return {
					id: loc.id,
					name: loc.name || '',
					barcode: loc.barcode || '',
					parent: loc.parent || null,
				};
			},
			{ locationId: drawerId },
		);

		// useSaveCallback for saving changes
		const { onSave } = useSaveCallback({
			id: drawerId || 'new',
			entityName: 'InventoryLocation',
			data,
			initialData,
			reload: () => {
				reload();
				onReload?.();
			},
			mapper: (data) => ({
				name: data.name,
				barcode: data.barcode || undefined,
				parent: data.parent || undefined,
			}),
		});

		return (
			<Drawer
				id={drawerId}
				title={drawerId === 'new' ? 'New Location' : 'Edit Location'}
				subtitle={initialData?.name}
				onClose={handleClose}
				onCancel={handleClose}
				onSave={
					onSave
						? async () => {
								await onSave?.();
								handleClose();
							}
						: undefined
				}
				saveText={loading ? 'Saving...' : 'Save'}
				cancelText="Cancel"
			>
				<div className="py-2 space-y-4">
					{/* Parent dropdown */}
					<SelectInput
						label="Parent Location"
						value={data?.parent || null}
						onChange={(parent) =>
							setData((current) => ({ ...current, parent }))
						}
						options={[
							{ value: '', label: 'No parent (root)' },
							...allLocations.map((loc) => ({
								value: loc.id,
								label: loc.name,
							})),
						]}
						placeholder="Select parent location (optional)"
					/>
					{/* Name input */}
					<Input
						label="Name"
						value={data?.name || ''}
						onChange={(name) => setData((current) => ({ ...current, name }))}
						placeholder="Location name"
					/>
					{/* Barcode input */}
					<Input
						label="Barcode (optional)"
						value={data?.barcode || ''}
						onChange={(barcode) =>
							setData((current) => ({ ...current, barcode }))
						}
						placeholder="Barcode (optional)"
					/>
				</div>
			</Drawer>
		);
	},
);

export { EditInventoryLocationDrawer };

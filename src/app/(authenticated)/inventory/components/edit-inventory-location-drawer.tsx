import React, { forwardRef, useCallback } from 'react';

import { Drawer } from '@/components/drawer';
import { Input } from '@/components/input';
import { API, gql } from '@/api/index';
import { useLoadData, useSaveCallback } from '@/hooks/load-data';

import { useInventoryDrawer } from './use-inventory-drawer';
import { InventoryLocationSelect } from './inventory-location-select';

const useInventoryLocationDrawer = ({
	ref,
	onReload,
}: {
	ref: React.Ref<{ openDrawer: (id: string) => void }>;
	onReload: () => void;
}) => {
	const { drawerId, handleClose, parentIdRef, reloadRef } = useInventoryDrawer({
		ref,
		onReload,
	});

	// useLoadData for fetching and managing location data
	const { data, setData, initialData, reload, loading } = useLoadData(
		async ({ locationId }) => {
			if (!locationId) {
				return null;
			}
			if (locationId === 'new') {
				return {
					id: 'new',
					name: '',
					barcode: '',
					parent: parentIdRef.current ?? null,
				};
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
		onSaved: () => {
			reload();
			onReload?.();
		},
		mapper: (data) => ({
			name: data.name,
			barcode: data.barcode || undefined,
			parent: data.parent || undefined,
		}),
	});

	return {
		data,
		setData,
		initialData,
		reload,
		loading,
		onSave,
		drawerId,
		handleClose,
		reloadRef,
	};
};

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
		const {
			data,
			setData,
			initialData,
			loading,
			onSave,
			drawerId,
			handleClose,
			reloadRef,
		} = useInventoryLocationDrawer({
			ref,
			onReload,
		});

		const drawerOnSave = useCallback(async () => {
			await onSave?.();
			handleClose();
		}, [onSave, handleClose]);

		const drawerOnDelete = useCallback(async () => {
			await API.query({
				query: gql(`
					mutation DeleteInventoryLocation($id: String!) {
						deleteInventoryLocation(id: $id)
					}
				`),
				variables: {
					id: data?.id,
				},
			});
			reloadRef.current?.();
			handleClose();
		}, [data?.id, reloadRef, handleClose]);

		if (!data) {
			return null;
		}

		return (
			<Drawer
				id={drawerId}
				title={drawerId === 'new' ? 'New Location' : 'Edit Location'}
				subtitle={initialData?.name}
				onClose={handleClose}
				onCancel={handleClose}
				onSave={drawerOnSave}
				saveText={loading ? 'Saving...' : 'Save'}
				cancelText="Cancel"
				deleteText={{
					title: 'Delete Inventory Location',
					content: (
						<>
							Are you sure you want to delete the Inventory Location{' '}
							<b>{data?.name}</b>? This action cannot be undone.
						</>
					),
				}}
				onDelete={drawerOnDelete}
			>
				<div className="divide-y divide-gray-200 px-4 sm:px-6">
					<div className="space-y-6 pb-5 pt-6">
						{/* Parent dropdown */}
						<InventoryLocationSelect
							value={data?.parent || ''}
							onChange={(parent) =>
								setData((current) => ({ ...current, parent }))
							}
							excludeId={drawerId || undefined}
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
				</div>
			</Drawer>
		);
	},
);

export { EditInventoryLocationDrawer };

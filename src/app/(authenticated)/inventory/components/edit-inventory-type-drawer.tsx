import React, { forwardRef } from 'react';

import { Drawer } from '@/components/drawer';
import { Input } from '@/components/input';
import { API, gql } from '@/api/index';
import { useLoadData, useSaveCallback } from '@/hooks/load-data';
import { Button } from '@/components/button';

import { InventoryTypeSelect } from './inventory-type-select';
import { useInventoryDrawer } from './use-inventory-drawer';

/**
 * Data shape for the inventory type drawer.
 * Includes all editable fields and parentName for display.
 */
type InventoryTypeDrawerData = {
	id: string | null;
	name: string;
	checkInterval?: string;
	checkType?: string;
	properties: string[];
	parent?: string;
	parentName?: string;
};

/**
 * Drawer component for editing an inventory type's properties.
 * Now supports editing name, checkInterval, checkType, and properties (array of string),
 * and displays the parent type's name (read-only, if present).
 *
 * @param {object} props
 * @param {React.MutableRefObject<() => void>} props.reloadRef - Ref to set the reload function for parent usage.
 * @param {React.Ref<{ openDrawer: (id: string) => void }>} ref - Ref to control the drawer imperatively.
 */
const EditInventoryTypeDrawer = forwardRef(
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

		// useLoadData for fetching and managing type data
		const { data, setData, initialData, reload, loading } = useLoadData<
			InventoryTypeDrawerData,
			{ typeId: string }
		>(
			async ({ typeId }) => {
				if (!typeId) {
					return null;
				}
				const empty = {
					id: 'new',
					name: '',
					checkInterval: undefined,
					checkType: '',
					properties: [],
					parent: undefined,
					parentName: undefined,
				};

				if (typeId === 'new') {
					return empty;
				}

				const res = await API.query({
					query: gql(`
						query InventoryTypeDetail($id: String!) {
							inventoryType(id: $id) {
								id
								name
								checkInterval
								checkType
								properties
								parent
							}
						}
					`),
					variables: { id: typeId },
				});

				if (!res || !res.inventoryType) {
					throw new Error('Inventory type not found');
				}
				const { inventoryType } = res;
				return {
					id: inventoryType.id,
					name: inventoryType.name,
					checkInterval: inventoryType.checkInterval
						? Number(inventoryType.checkInterval).toFixed(0)
						: undefined,
					checkType: inventoryType.checkType ?? undefined,
					properties: inventoryType.properties,
					parent: inventoryType.parent ?? undefined,
					parentName: undefined,
				};
			},
			{ typeId: drawerId ?? 'new' },
		);

		// useSaveCallback for saving changes
		const { onSave } = useSaveCallback({
			id: drawerId || 'new',
			entityName: 'InventoryType',
			data,
			initialData,
			reload: () => {
				reload();
				onReload?.();
			},
			mapper: (d) => ({
				name: d.name,
				checkInterval:
					d.checkInterval === undefined ||
					d.checkInterval === null ||
					d.checkInterval === ''
						? null
						: Number(d.checkInterval),
				checkType: d.checkType || null,
				properties: Array.isArray(d.properties)
					? d.properties.filter((p: string) => p && p.trim())
					: [],
				parent:
					d.parent === '' || d.parent === undefined ? undefined : d.parent,
			}),
		});

		// --- UI for properties array ---
		const handlePropertyChange = (idx: number, value: string) => {
			setData((current) => {
				if (!current) {
					return current;
				}
				const next = [...(current.properties || [])];
				next[idx] = value ?? '';
				return { ...current, properties: next };
			});
		};
		const handleAddProperty = () => {
			setData((current) => {
				if (!current) {
					return current;
				}
				return { ...current, properties: [...(current.properties || []), ''] };
			});
		};
		const handleRemoveProperty = (idx: number) => {
			setData((current) => {
				if (!current) {
					return current;
				}
				const next = [...(current.properties || [])];
				next.splice(idx, 1);
				return { ...current, properties: next };
			});
		};

		if (!data) {
			return null;
		}

		return (
			<Drawer
				id={drawerId}
				title={drawerId === 'new' ? 'New Type' : 'Edit Type'}
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
				deleteText={{
					title: 'Delete Inventory Type',
					content: (
						<>
							Are you sure you want to delete the Inventory Type
							<b>{data?.name}</b>? This action cannot be undone.
						</>
					),
				}}
				onDelete={
					data.id === 'new'
						? undefined
						: async () => {
								await API.query({
									query: gql(`
									mutation DeleteInventoryType($id: String!) {
										deleteInventoryType(id: $id)
									}
								`),
									variables: {
										id: data.id,
									},
								});
								onReload?.();
								handleClose();
							}
				}
			>
				<div className="divide-y divide-gray-200 px-4 sm:px-6">
					<div className="space-y-6 pb-5 pt-6">
						{/* Parent type dropdown */}
						<InventoryTypeSelect
							value={data.parent || ''}
							onChange={(parent) =>
								setData((current) => ({
									...current!,
									parent: parent || undefined,
								}))
							}
							excludeId={drawerId || undefined}
						/>
						{/* Name input */}
						<Input
							label="Name"
							value={data.name}
							onChange={(name) =>
								setData((current) => ({ ...current!, name: name ?? '' }))
							}
							placeholder="Type name"
						/>
						{/* CheckInterval and CheckType in one row */}
						<div className="flex gap-2">
							<Input
								label="Check Interval (days)"
								type="number"
								value={
									typeof data.checkInterval === 'string'
										? data.checkInterval
										: data.checkInterval == null
											? ''
											: String(data.checkInterval)
								}
								onChange={(v) =>
									setData((current) => ({
										...current!,
										checkInterval: v ?? '',
									}))
								}
								placeholder="e.g. 30"
								className="flex-1"
							/>
							<Input
								label="Check Type"
								value={data.checkType}
								onChange={(v) =>
									setData((current) => ({ ...current!, checkType: v ?? '' }))
								}
								placeholder="e.g. NONE, MANUAL, ..."
								className="flex-1"
							/>
						</div>
						{/* Properties array */}
						<div>
							<div className="flex items-center justify-between mb-1">
								<label className="block text-sm font-medium leading-6 text-gray-900">
									Properties
								</label>
								<Button small secondary onClick={handleAddProperty}>
									Add
								</Button>
							</div>
							{data.properties.length === 0 && (
								<div className="text-xs text-gray-400">
									No properties defined.
								</div>
							)}
							{data.properties.map((prop: string, idx: number) => (
								<div key={idx} className="flex gap-2 items-center mb-1">
									<Input
										value={prop}
										onChange={(v) => handlePropertyChange(idx, v ?? '')}
										placeholder={`Property #${idx + 1}`}
										className="flex-1"
									/>
									<Button
										small
										danger
										onClick={() => handleRemoveProperty(idx)}
									>
										Remove
									</Button>
								</div>
							))}
						</div>
					</div>
				</div>
			</Drawer>
		);
	},
);

export { EditInventoryTypeDrawer };
